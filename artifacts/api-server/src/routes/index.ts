import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import propertiesRouter from "./properties.js";
import tenantsRouter from "./tenants.js";
import maintenanceRouter from "./maintenance.js";
import refurbRouter from "./refurb.js";
import statsRouter from "./stats.js";
import valuationsRouter from "./valuations.js";
import uploadRouter from "./upload.js";
import rentRouter from "./rent.js";
import tradespeopleRouter from "./tradespeople.js";
import dealsRouter from "./deals.js";

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
router.use(dealsRouter);

export default router;
