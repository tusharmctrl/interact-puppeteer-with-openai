import { Router } from 'express';
import { loginJourney } from '../controllers/login.js';
import { registerJourney } from '../controllers/register.js';

const generalRoutes = Router()

generalRoutes.get("/register-journey", registerJourney);
generalRoutes.get("/login-journey", loginJourney);

export default generalRoutes;
