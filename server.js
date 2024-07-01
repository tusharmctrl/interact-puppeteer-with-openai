import express from "express"
import cors from "cors"
import { config } from 'dotenv';
config({ path: `.env` });
import router from "./routes/index.route.js"
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/', router);

const PORT = process.env.API_PORT;
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 App listening on the port ${PORT}`);
    console.log('=================================');
});
