import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import {
  createPlanHandler,
  getAllPlansHandler,
  updatePlanHandler,
} from './plan.service';

const createPlan = catchAsync(async (req, res) => {
  const result = await createPlanHandler(req.body);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Plan created successfully',
    data: result,
  });
});

const updatePlan = catchAsync(async (req, res) => {
  const result = await updatePlanHandler(req.params.id, req.body);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Plan updated successfully',
    data: result,
  });
});

const getAllPlans = catchAsync(async (req, res) => {
  const plans = await getAllPlansHandler();
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Plans fetched successfully',
    data: plans,
  });
});

export { createPlan, updatePlan, getAllPlans };
