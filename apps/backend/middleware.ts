import type { NextFunction, Request, Response } from "express";
import { createClerkClient, getAuth } from "@clerk/express";

let _clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!_clerkClient) {
    _clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return _clerkClient;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        email: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log("=== AUTH MIDDLEWARE START ===");
    console.log("Auth header:", req.headers.authorization?.substring(0, 50) + "...");

    // Use Clerk's getAuth to get authentication info from the request
    const auth = getAuth(req);
    console.log("getAuth result:", { userId: auth.userId, sessionId: auth.sessionId });

    if (!auth.userId) {
      console.log("AUTH FAILED: No userId from getAuth");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = auth.userId;
    console.log("userId found:", userId);

    // Fetch user details from Clerk
    const clerkClient = getClerkClient();
    console.log("Fetching user from Clerk...");
    const user = await clerkClient.users.getUser(userId);
    console.log("user from clerk:", user.id, user.emailAddresses?.length, "emails");

    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      console.error("No email found for user");
      res.status(400).json({ message: "User email not found" });
      return;
    }

    // Attach the user ID and email to the request
    req.userId = userId;
    req.user = {
      email: primaryEmail.emailAddress,
    };

    console.log("=== AUTH SUCCESS ===");
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({
      message: "Error processing authentication",
      details:
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : undefined,
    });
    return;
  }
}
