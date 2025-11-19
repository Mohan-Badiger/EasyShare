import cors from "cors";

const corsOptions = cors({
  origin: "*", // allow your frontend domain later
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
});

export default corsOptions;
