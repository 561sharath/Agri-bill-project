import { getDashboardSummaryService } from '../services/dashboardService.js';

// @desc    Get dashboard metrics, charts, and alerts in one call
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await getDashboardSummaryService();
        res.status(200).json(summary);
    } catch (error) {
        // Pass any errors to the global error middleware
        next(error);
    }
};
