import { Earning } from './earning.model';
import { User } from '../user/user.model';

/**
 * Backfill totalEarnings for all authors from existing Earning records
 * Run this once to sync totalEarnings with existing data
 */
export const backfillTotalEarnings = async () => {
  try {
    console.warn('[Backfill] Starting totalEarnings backfill...');

    // Get all earnings grouped by author
    const earningsByAuthor = await Earning.aggregate([
      {
        $group: {
          _id: '$author',
          totalEarnings: { $sum: '$authorEarning' },
          count: { $sum: 1 },
        },
      },
    ]);

    console.warn(
      `[Backfill] Found earnings for ${earningsByAuthor.length} authors`
    );

    // Update each author's totalEarnings
    let updated = 0;
    for (const authorEarning of earningsByAuthor) {
      const author = await User.findById(authorEarning._id);
      if (author) {
        const oldTotal = author.totalEarnings || 0;
        author.totalEarnings = authorEarning.totalEarnings;
        await author.save();

        console.warn(
          `[Backfill] Author ${author.email}: ${oldTotal} -> ${authorEarning.totalEarnings} (${authorEarning.count} earnings)`
        );
        updated++;
      } else {
        console.warn(
          `[Backfill] Author ${authorEarning._id} not found, skipping`
        );
      }
    }

    console.warn(`[Backfill] Completed! Updated ${updated} authors.`);
    return { success: true, updated };
  } catch (error) {
    console.error('[Backfill] Error:', error);
    throw error;
  }
};
