import express from 'express';
import cors from 'cors';
import profileRoute from './routes/profileRoute.js';
import dbConnect from './config/connectDB.js';
import errorHandler from './middleware/errorHandler.js';

dbConnect();

const app = express();
app.use(express.json());

app.use(cors({
    origin: '*',
}));

app.use('/api', profileRoute);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found"
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
})