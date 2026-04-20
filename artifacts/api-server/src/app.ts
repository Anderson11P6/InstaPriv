import { Request, Response } from 'express';

const serializers = {
  // Example of updating properly typing the req and res parameters
  example: (req: Request, res: Response) => {
    // Your implementation here
  },
};

// Export serializers if needed
export default serializers;