import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function VerificationSent() {
  const { toast } = useToast();
  const emailParam = new URLSearchParams(window.location.search).get('email');
  const email = emailParam || 'your email';

  const resendVerification = useMutation({
    mutationFn: async () => {
      if (!emailParam) {
        throw new Error('Email parameter is missing');
      }
      return apiRequest(`/api/auth/resend-verification`, {
        method: 'POST',
        data: { email: emailParam },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification email has been sent to your inbox.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Resend',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleResend = () => {
    resendVerification.mutate();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Email Verification Required</CardTitle>
          <CardDescription className="text-center">
            We've sent a verification link to <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-md text-sm text-blue-800 space-y-2">
            <p>Please check your inbox and click the verification link to activate your account.</p>
            <p>The link will expire in 24 hours.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleResend} 
            variant="outline" 
            className="w-full"
            disabled={resendVerification.isPending}
          >
            {resendVerification.isPending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          <div className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-blue-600 hover:underline">
              Return to Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}