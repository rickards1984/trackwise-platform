import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verifyToken() {
      try {
        // Extract token from URL
        const searchParams = new URLSearchParams(location.split("?")[1]);
        const token = searchParams.get("token");
        
        if (!token) {
          setStatus("error");
          setMessage("Verification token is missing.");
          return;
        }

        // Call API to verify token
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: "GET",
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been successfully verified!");
          
          toast({
            title: "Email Verified",
            description: "Your account has been activated. You can now log in.",
          });
        } else {
          setStatus("error");
          setMessage(data.message || "Failed to verify your email. The token may be invalid or expired.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred while verifying your email.");
      }
    }

    verifyToken();
  }, [location, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className={`p-3 rounded-full ${
              status === "loading" ? "bg-blue-100" : 
              status === "success" ? "bg-green-100" : "bg-red-100"
            }`}>
              {status === "loading" && <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />}
              {status === "success" && <CheckCircle className="h-8 w-8 text-green-600" />}
              {status === "error" && <AlertCircle className="h-8 w-8 text-red-600" />}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Verifying Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address..."}
            {status === "success" && "Your account has been activated successfully."}
            {status === "error" && "We encountered an issue with your verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className={`text-${
            status === "loading" ? "neutral" : 
            status === "success" ? "green" : "red"
          }-600`}>
            {message}
          </p>
          
          {status === "success" && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md">
              <p className="text-green-800 text-sm">
                You can now log in to your account and start using all the features of the platform.
              </p>
            </div>
          )}
          
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-800 text-sm">
                If you're having trouble, try registering again or contact support for assistance.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== "loading" && (
            <Link href="/login">
              <Button variant={status === "success" ? "default" : "outline"}>
                Go to Login
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}