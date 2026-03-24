import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import tenantsRouter from "./tenants";
import maintenanceRouter from "./maintenance";
import refurbRouter from "./refurb";
import statsRouter from "./stats";
import valuationsRouter from "./valuations";
import uploadRouter from "./upload";
import rentRouter from "./rent";
import tradespeopleRouter from "./tradespeople";

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(tenantsRouter);
router.use(maintenanceRouter);
router.use(refurbRouter);
router.use(statsRouter);
router.use(valuationsRouter);
router.use(uploadRouter);
router.use(rentRouter);
router.use(tradespeopleRouter);

export default router;
