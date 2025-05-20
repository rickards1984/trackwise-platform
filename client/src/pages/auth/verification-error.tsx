import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function VerificationError() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-xl font-bold">Verification Failed</CardTitle>
          <CardDescription>
            We couldn't verify your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            The verification link may have expired or is invalid. Please request a new verification link.
          </p>
          <div className="space-y-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/resend-verification">Request New Verification Link</Link>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-gray-500">
            Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}