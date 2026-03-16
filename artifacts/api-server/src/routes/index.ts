import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import tenantsRouter from "./tenants";
import maintenanceRouter from "./maintenance";
import refurbRouter from "./refurb";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(tenantsRouter);
router.use(maintenanceRouter);
router.use(refurbRouter);
router.use(statsRouter);

export default router;
