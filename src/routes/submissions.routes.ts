import { Router, Request, Response } from 'express';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { dbService } from '../services/database.service';

const router = Router();

// Get all submissions with pagination and search
router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const searchQuery = (req.query.search as string)?.trim();
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = parseInt(req.query.page as string) || 1;

    const actualOffset = page > 1 ? (page - 1) * limit : offset;

    const submissions = await dbService.getAllSubmissions({
      status,
      searchQuery,
      limit,
      offset: actualOffset,
    });

    const totalCount = await dbService.getSubmissionCount({ status, searchQuery });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return res.json({
      success: true,
      submissions,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: totalCount,
        limit,
        offset: actualOffset,
        has_next: hasNext,
        has_prev: hasPrev,
      },
      search_query: searchQuery || '',
    });
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get single submission by ID
router.get('/:submission_id', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const submissionId = parseInt(req.params.submission_id);
    const submission = await dbService.getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({
      success: true,
      submission,
    });
  } catch (error: any) {
    console.error('Error fetching submission:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update submission status
router.put('/:submission_id/status', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const submissionId = parseInt(req.params.submission_id);
    const { status, comments } = req.body;
    const reviewedBy = req.user?.username || 'admin';

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get submission first to check if it exists
    const submission = await dbService.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    await dbService.updateSubmissionStatus(submissionId, status, comments, reviewedBy);

    return res.json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating submission status:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;



