import { Router } from "express";
import { loginJourney } from "../controllers/login.js";
import { registerJourney } from "../controllers/register.js";
import { homePageJourney } from "../controllers/homePage.js";

const generalRoutes = Router();

generalRoutes.get("/register-journey", registerJourney);
generalRoutes.get("/login-journey", loginJourney);
generalRoutes.get("/home-page-journey", homePageJourney);

export default generalRoutes;
