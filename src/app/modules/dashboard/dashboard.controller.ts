import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import httpStatus from '../../constant/httpStatus';
import { DashboardService } from './dashboard.service';
import { backfillTotalEarnings } from './backfillTotalEarnings';

/**
 * Get author analytics
 * @route GET /api/v1/dashboard/author
 * @access Private (Author only)
 */
const getAuthorAnalytics = catchAsync(async (req: Request, res: Response) => {
  const authorId = req.user?.userId;

  const result = await DashboardService.getAuthorAnalytics(authorId!);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Author analytics retrieved successfully',
    data: result,
  });
});

/**
 * Get admin analytics
 * @route GET /api/v1/dashboard/admin
 * @access Private (Admin, Super Admin only)
 */
const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAdminAnalytics();

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin analytics retrieved successfully',
    data: result,
  });
});

/**
 * Backfill totalEarnings for all authors
 * @route POST /api/v1/dashboard/backfill-earnings
 * @access Private (Admin, Super Admin only)
 */
const backfillEarnings = catchAsync(async (req: Request, res: Response) => {
  const result = await backfillTotalEarnings();

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Total earnings backfilled successfully',
    data: result,
  });
});

export { getAuthorAnalytics, getAdminAnalytics, backfillEarnings };
