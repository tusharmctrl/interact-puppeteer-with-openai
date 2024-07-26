import { Router } from "express";
import { loginJourney } from "../controllers/login.js";
import { registerJourney } from "../controllers/register.js";
import { homePageJourney } from "../controllers/homePage.js";
import { trustPilot } from "../controllers/perception.js";
import { performance } from "../controllers/performance.js";
import { depositJourney } from "../controllers/deposit.js";

const generalRoutes = Router();

generalRoutes.get("/register-journey", registerJourney);
generalRoutes.get("/login-journey", loginJourney);
generalRoutes.get("/home-page-journey", homePageJourney);
generalRoutes.get("/trustpilot-perception", trustPilot);
generalRoutes.get("/performance", performance);
generalRoutes.get("/deposit-journey", depositJourney);

export default generalRoutes;
