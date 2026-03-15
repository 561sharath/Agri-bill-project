import {
    getSalesSummaryService,
    getInventorySummaryService,
    getFarmerStatsSummaryService,
    getCreditSummaryService,
    getChartDataService,
} from '../services/dashboardService.js';

// @desc    Get sales summary (today's sales + charts)
// @route   GET /api/dashboard/sales
// @access  Private
export const getSalesSummary = async (req, res, next) => {
    try {
        const data = await getSalesSummaryService();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get inventory summary (low stock alerts)
// @route   GET /api/dashboard/inventory
// @access  Private
export const getInventorySummary = async (req, res, next) => {
    try {
        const data = await getInventorySummaryService();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get farmer statistics
// @route   GET /api/dashboard/farmers
// @access  Private
export const getFarmerStatsSummary = async (req, res, next) => {
    try {
        const data = await getFarmerStatsSummaryService();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get credit summary (pending credit ledger)
// @route   GET /api/dashboard/credit
// @access  Private
export const getCreditSummary = async (req, res, next) => {
    try {
        const data = await getCreditSummaryService();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get chart data (monthly + weekly revenue)
// @route   GET /api/dashboard/charts
// @access  Private
export const getChartData = async (req, res, next) => {
    try {
        const data = await getChartDataService();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};
