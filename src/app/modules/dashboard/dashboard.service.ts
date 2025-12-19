import { Types } from 'mongoose';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { Asset } from '../asset/asset.model';
import { AssetStats } from '../assetStats/assetStats.model';
import { EarningService } from './earning.service';
import { TAuthorAnalytics, TAdminAnalytics } from './dashboard.interface';
import { IndividualPayment } from '../individualPayment/individualPayment.model';

/**
 * Get views/downloads count for a specific period
 */
const getStatsForPeriod = async (
  authorId: string,
  type: 'views' | 'downloads',
  period: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<number> => {
  const { start, end } = EarningService.getDateRange(period);

  // Get author's assets
  const authorAssets = await Asset.find({ author: authorId }).select('_id');
  const assetIds = authorAssets.map(a => a._id);

  if (assetIds.length === 0) {
    return 0;
  }

  // For lifetime, just sum up current stats
  if (period === 'today') {
    // For time-based periods, we need a different approach
    // Since we don't track view/download history by date,
    // we'll need to use payment dates as proxy for downloads
    if (type === 'downloads') {
      const count = await IndividualPayment.countDocuments({
        asset: { $in: assetIds },
        paymentStatus: 'completed',
        transactionDate: { $gte: start, $lte: end },
      });
      return count;
    }
    // For views, we can't track by date without history, return 0 for now
    return 0;
  }

  // For non-today periods, use payment transactions
  if (type === 'downloads') {
    const count = await IndividualPayment.countDocuments({
      asset: { $in: assetIds },
      paymentStatus: 'completed',
      transactionDate: { $gte: start, $lte: end },
    });
    return count;
  }

  return 0;
};

/**
 * Get total views/downloads (lifetime)
 */
const getLifetimeStats = async (
  authorId: string,
  type: 'views' | 'downloads'
): Promise<number> => {
  // Get author's assets
  const authorAssets = await Asset.find({ author: authorId }).select('_id');
  const assetIds = authorAssets.map(a => a._id);

  if (assetIds.length === 0) {
    return 0;
  }

  const stats = await AssetStats.aggregate([
    {
      $match: {
        asset: { $in: assetIds },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: type === 'views' ? '$views' : '$downloads' },
      },
    },
  ]);

  return stats[0]?.total || 0;
};

/**
 * Get author analytics
 */
const getAuthorAnalytics = async (
  authorId: string
): Promise<TAuthorAnalytics> => {
  // Verify author exists
  const author = await User.findById(authorId);
  if (!author) {
    throw new AppError(httpStatus.NOT_FOUND, 'Author not found');
  }

  if (author.role !== 'author') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only authors can access author analytics'
    );
  }

  // Get lifetime views and downloads
  const [lifetimeViews, lifetimeDownloads] = await Promise.all([
    getLifetimeStats(authorId, 'views'),
    getLifetimeStats(authorId, 'downloads'),
  ]);

  // Get time-period downloads
  const [
    todayDownloads,
    yesterdayDownloads,
    weekDownloads,
    monthDownloads,
    yearDownloads,
  ] = await Promise.all([
    getStatsForPeriod(authorId, 'downloads', 'today'),
    getStatsForPeriod(authorId, 'downloads', 'yesterday'),
    getStatsForPeriod(authorId, 'downloads', 'thisWeek'),
    getStatsForPeriod(authorId, 'downloads', 'thisMonth'),
    getStatsForPeriod(authorId, 'downloads', 'thisYear'),
  ]);

  // Get earnings
  const lifetimeEarnings = author.totalEarnings || 0;
  const [
    todayEarnings,
    yesterdayEarnings,
    weekEarnings,
    monthEarnings,
    yearEarnings,
  ] = await Promise.all([
    EarningService.getEarningsForPeriod(authorId, 'today'),
    EarningService.getEarningsForPeriod(authorId, 'yesterday'),
    EarningService.getEarningsForPeriod(authorId, 'thisWeek'),
    EarningService.getEarningsForPeriod(authorId, 'thisMonth'),
    EarningService.getEarningsForPeriod(authorId, 'thisYear'),
  ]);

  // Get top assets
  const topAssets = await AssetStats.aggregate([
    {
      $lookup: {
        from: 'assets',
        localField: 'asset',
        foreignField: '_id',
        as: 'assetData',
      },
    },
    {
      $unwind: '$assetData',
    },
    {
      $match: {
        'assetData.author': new Types.ObjectId(authorId),
      },
    },
    {
      $lookup: {
        from: 'earnings',
        localField: 'asset',
        foreignField: 'asset',
        as: 'earningsData',
      },
    },
    {
      $addFields: {
        totalEarnings: {
          $sum: '$earningsData.authorEarning',
        },
      },
    },
    {
      $project: {
        assetId: '$assetData._id',
        title: '$assetData.title',
        views: 1,
        downloads: 1,
        earnings: '$totalEarnings',
      },
    },
    {
      $sort: { downloads: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  return {
    views: {
      lifetime: lifetimeViews,
      today: 0, // Views not tracked by date
      yesterday: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
    },
    downloads: {
      lifetime: lifetimeDownloads,
      today: todayDownloads,
      yesterday: yesterdayDownloads,
      thisWeek: weekDownloads,
      thisMonth: monthDownloads,
      thisYear: yearDownloads,
    },
    earnings: {
      lifetime: Number(lifetimeEarnings.toFixed(2)),
      today: Number(todayEarnings.toFixed(2)),
      yesterday: Number(yesterdayEarnings.toFixed(2)),
      thisWeek: Number(weekEarnings.toFixed(2)),
      thisMonth: Number(monthEarnings.toFixed(2)),
      thisYear: Number(yearEarnings.toFixed(2)),
    },
    topAssets: topAssets.map(asset => ({
      assetId: asset.assetId.toString(),
      title: asset.title,
      views: asset.views,
      downloads: asset.downloads,
      earnings: Number((asset.earnings || 0).toFixed(2)),
    })),
  };
};

/**
 * Get total downloads for admin (all platform)
 */
const getTotalDownloadsForPeriod = async (
  period: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<number> => {
  const { start, end } = EarningService.getDateRange(period);

  const count = await IndividualPayment.countDocuments({
    paymentStatus: 'completed',
    transactionDate: { $gte: start, $lte: end },
  });

  return count;
};

/**
 * Get admin analytics
 */
const getAdminAnalytics = async (): Promise<TAdminAnalytics> => {
  // Get lifetime stats
  const [lifetimeViews, lifetimeDownloads] = await Promise.all([
    AssetStats.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]).then(res => res[0]?.total || 0),
    AssetStats.aggregate([
      { $group: { _id: null, total: { $sum: '$downloads' } } },
    ]).then(res => res[0]?.total || 0),
  ]);

  // Get time-period downloads
  const [
    todayDownloads,
    yesterdayDownloads,
    weekDownloads,
    monthDownloads,
    yearDownloads,
  ] = await Promise.all([
    getTotalDownloadsForPeriod('today'),
    getTotalDownloadsForPeriod('yesterday'),
    getTotalDownloadsForPeriod('thisWeek'),
    getTotalDownloadsForPeriod('thisMonth'),
    getTotalDownloadsForPeriod('thisYear'),
  ]);

  // Get lifetime revenue from BOTH old Earning model and new IndividualPaymentRevenue model
  const [
    lifetimeIndividualTotalRevenueNew,
    lifetimeIndividualAuthorRevenueNew,
    lifetimeIndividualCompanyRevenueNew,
  ] = await Promise.all([
    EarningService.getIndividualPaymentRevenueForPeriod('lifetime', 'total'),
    EarningService.getIndividualPaymentRevenueForPeriod('lifetime', 'author'),
    EarningService.getIndividualPaymentRevenueForPeriod('lifetime', 'company'),
  ]);

  // Get data from old Earning model (for backward compatibility)
  const [lifetimeAuthorEarningsOld, lifetimeCompanyEarningsOld] =
    await Promise.all([
      EarningService.getTotalAuthorEarningsForPeriod('lifetime'),
      EarningService.getCompanyEarningsForPeriod('lifetime'),
    ]);

  // Combine old and new data
  const lifetimeIndividualAuthorRevenue =
    lifetimeIndividualAuthorRevenueNew + lifetimeAuthorEarningsOld;
  const lifetimeIndividualCompanyRevenue =
    lifetimeIndividualCompanyRevenueNew + lifetimeCompanyEarningsOld;
  const lifetimeIndividualTotalRevenue =
    lifetimeIndividualAuthorRevenue + lifetimeIndividualCompanyRevenue;

  // Get subscription revenue (100% company)
  const lifetimeSubscriptionRevenue =
    await EarningService.getSubscriptionRevenueForPeriod('lifetime');

  // Get time-period revenue from both sources
  const [
    todayIndividualAuthorRevenueNew,
    yesterdayIndividualAuthorRevenueNew,
    weekIndividualAuthorRevenueNew,
    monthIndividualAuthorRevenueNew,
    yearIndividualAuthorRevenueNew,
  ] = await Promise.all([
    EarningService.getIndividualPaymentRevenueForPeriod('today', 'author'),
    EarningService.getIndividualPaymentRevenueForPeriod('yesterday', 'author'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisWeek', 'author'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisMonth', 'author'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisYear', 'author'),
  ]);

  const [
    todayAuthorEarningsOld,
    yesterdayAuthorEarningsOld,
    weekAuthorEarningsOld,
    monthAuthorEarningsOld,
    yearAuthorEarningsOld,
  ] = await Promise.all([
    EarningService.getTotalAuthorEarningsForPeriod('today'),
    EarningService.getTotalAuthorEarningsForPeriod('yesterday'),
    EarningService.getTotalAuthorEarningsForPeriod('thisWeek'),
    EarningService.getTotalAuthorEarningsForPeriod('thisMonth'),
    EarningService.getTotalAuthorEarningsForPeriod('thisYear'),
  ]);

  // Combine old and new author data
  const todayIndividualAuthorRevenue =
    todayIndividualAuthorRevenueNew + todayAuthorEarningsOld;
  const yesterdayIndividualAuthorRevenue =
    yesterdayIndividualAuthorRevenueNew + yesterdayAuthorEarningsOld;
  const weekIndividualAuthorRevenue =
    weekIndividualAuthorRevenueNew + weekAuthorEarningsOld;
  const monthIndividualAuthorRevenue =
    monthIndividualAuthorRevenueNew + monthAuthorEarningsOld;
  const yearIndividualAuthorRevenue =
    yearIndividualAuthorRevenueNew + yearAuthorEarningsOld;

  const [
    todayIndividualCompanyRevenueNew,
    yesterdayIndividualCompanyRevenueNew,
    weekIndividualCompanyRevenueNew,
    monthIndividualCompanyRevenueNew,
    yearIndividualCompanyRevenueNew,
  ] = await Promise.all([
    EarningService.getIndividualPaymentRevenueForPeriod('today', 'company'),
    EarningService.getIndividualPaymentRevenueForPeriod('yesterday', 'company'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisWeek', 'company'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisMonth', 'company'),
    EarningService.getIndividualPaymentRevenueForPeriod('thisYear', 'company'),
  ]);

  const [
    todayCompanyEarningsOld,
    yesterdayCompanyEarningsOld,
    weekCompanyEarningsOld,
    monthCompanyEarningsOld,
    yearCompanyEarningsOld,
  ] = await Promise.all([
    EarningService.getCompanyEarningsForPeriod('today'),
    EarningService.getCompanyEarningsForPeriod('yesterday'),
    EarningService.getCompanyEarningsForPeriod('thisWeek'),
    EarningService.getCompanyEarningsForPeriod('thisMonth'),
    EarningService.getCompanyEarningsForPeriod('thisYear'),
  ]);

  // Combine old and new company data
  const todayIndividualCompanyRevenue =
    todayIndividualCompanyRevenueNew + todayCompanyEarningsOld;
  const yesterdayIndividualCompanyRevenue =
    yesterdayIndividualCompanyRevenueNew + yesterdayCompanyEarningsOld;
  const weekIndividualCompanyRevenue =
    weekIndividualCompanyRevenueNew + weekCompanyEarningsOld;
  const monthIndividualCompanyRevenue =
    monthIndividualCompanyRevenueNew + monthCompanyEarningsOld;
  const yearIndividualCompanyRevenue =
    yearIndividualCompanyRevenueNew + yearCompanyEarningsOld;

  // Get time-period subscription revenue
  const [
    todaySubscriptionRevenue,
    yesterdaySubscriptionRevenue,
    weekSubscriptionRevenue,
    monthSubscriptionRevenue,
    yearSubscriptionRevenue,
  ] = await Promise.all([
    EarningService.getSubscriptionRevenueForPeriod('today'),
    EarningService.getSubscriptionRevenueForPeriod('yesterday'),
    EarningService.getSubscriptionRevenueForPeriod('thisWeek'),
    EarningService.getSubscriptionRevenueForPeriod('thisMonth'),
    EarningService.getSubscriptionRevenueForPeriod('thisYear'),
  ]);

  // Get user counts
  const [totalUsers, subscribers, authors, premium] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: 'subscriber', isDeleted: false }),
    User.countDocuments({ role: 'author', isDeleted: false }),
    User.countDocuments({ isPremium: true, isDeleted: false }),
  ]);

  // Get asset counts
  const [totalAssets, pending, approved, rejected] = await Promise.all([
    Asset.countDocuments(),
    Asset.countDocuments({ status: 'pending_review' }),
    Asset.countDocuments({ status: 'approved' }),
    Asset.countDocuments({ status: 'rejected' }),
  ]);

  return {
    views: {
      lifetime: lifetimeViews,
      today: 0, // Views not tracked by date
      yesterday: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
    },
    downloads: {
      lifetime: lifetimeDownloads,
      today: todayDownloads,
      yesterday: yesterdayDownloads,
      thisWeek: weekDownloads,
      thisMonth: monthDownloads,
      thisYear: yearDownloads,
    },
    earnings: {
      total: {
        lifetime: Number(
          (
            lifetimeIndividualTotalRevenue + lifetimeSubscriptionRevenue
          ).toFixed(2)
        ),
        today: Number(
          (
            todayIndividualCompanyRevenue +
            todayIndividualAuthorRevenue +
            todaySubscriptionRevenue
          ).toFixed(2)
        ),
        yesterday: Number(
          (
            yesterdayIndividualCompanyRevenue +
            yesterdayIndividualAuthorRevenue +
            yesterdaySubscriptionRevenue
          ).toFixed(2)
        ),
        thisWeek: Number(
          (
            weekIndividualCompanyRevenue +
            weekIndividualAuthorRevenue +
            weekSubscriptionRevenue
          ).toFixed(2)
        ),
        thisMonth: Number(
          (
            monthIndividualCompanyRevenue +
            monthIndividualAuthorRevenue +
            monthSubscriptionRevenue
          ).toFixed(2)
        ),
        thisYear: Number(
          (
            yearIndividualCompanyRevenue +
            yearIndividualAuthorRevenue +
            yearSubscriptionRevenue
          ).toFixed(2)
        ),
      },
      company: {
        lifetime: Number(
          (
            lifetimeIndividualCompanyRevenue + lifetimeSubscriptionRevenue
          ).toFixed(2)
        ),
        today: Number(
          (todayIndividualCompanyRevenue + todaySubscriptionRevenue).toFixed(2)
        ),
        yesterday: Number(
          (
            yesterdayIndividualCompanyRevenue + yesterdaySubscriptionRevenue
          ).toFixed(2)
        ),
        thisWeek: Number(
          (weekIndividualCompanyRevenue + weekSubscriptionRevenue).toFixed(2)
        ),
        thisMonth: Number(
          (monthIndividualCompanyRevenue + monthSubscriptionRevenue).toFixed(2)
        ),
        thisYear: Number(
          (yearIndividualCompanyRevenue + yearSubscriptionRevenue).toFixed(2)
        ),
      },
      authors: {
        lifetime: Number(lifetimeIndividualAuthorRevenue.toFixed(2)),
        today: Number(todayIndividualAuthorRevenue.toFixed(2)),
        yesterday: Number(yesterdayIndividualAuthorRevenue.toFixed(2)),
        thisWeek: Number(weekIndividualAuthorRevenue.toFixed(2)),
        thisMonth: Number(monthIndividualAuthorRevenue.toFixed(2)),
        thisYear: Number(yearIndividualAuthorRevenue.toFixed(2)),
      },
    },
    users: {
      total: totalUsers,
      subscribers,
      authors,
      premium,
    },
    assets: {
      total: totalAssets,
      pending,
      approved,
      rejected,
    },
  };
};

export const DashboardService = {
  getAuthorAnalytics,
  getAdminAnalytics,
};
