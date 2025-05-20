import { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { login } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/App";
import { School } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await login({
        username: values.username,
        password: values.password,
      });
      
      console.log('Login response:', response);
      
      // Handle different account states
      if (response.user?.status === "unverified") {
        toast({
          title: "Email verification required",
          description: "Please verify your email address before logging in. Check your inbox for a verification link.",
          variant: "destructive",
        });
        navigate("/auth/verification-sent");
        return;
      } else if (response.user?.status === "pending_approval") {
        toast({
          title: "Account pending approval",
          description: "Your account is pending administrator approval. You'll be notified when access is granted.",
          variant: "destructive",
        });
        return;
      } else if (response.user?.status === "suspended") {
        toast({
          title: "Account suspended",
          description: "Your account has been suspended. Please contact support for assistance.",
          variant: "destructive",
        });
        return;
      } else if (response.user?.status === "deactivated") {
        toast({
          title: "Account deactivated",
          description: "Your account has been deactivated. Please contact support to reactivate it.",
          variant: "destructive",
        });
        return;
      }
      
      // Set user in context and continue with login
      if (response.user) {
        setUser(response.user);
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.user.firstName}!`,
        });
        navigate("/dashboard");
      } else {
        throw new Error("Login failed - user data missing");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Invalid username or password. Please try again.";
      
      if (error.message === "Email not verified") {
        errorMessage = "Your email address has not been verified. Please check your inbox for the verification link.";
      } else if (error.response?.status === 401) {
        errorMessage = "Invalid username or password. Please try again.";
      } else if (error.response?.status === 403) {
        if (error.response.data?.pendingApproval) {
          errorMessage = "Your account is pending approval. Please try again later.";
        } else if (error.response.data?.accountLocked) {
          errorMessage = "Your account has been locked. Please contact support.";
        }
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-primary-light rounded-full">
              <School className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">SkillTrack</CardTitle>
          <CardDescription>
            Sign in to your apprenticeship training platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            <span className="text-neutral-500">Don't have an account? </span>
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </div>
          <div className="text-xs text-center text-neutral-500">
            Demo accounts: learner/password, tutor/password, iqa/password
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
