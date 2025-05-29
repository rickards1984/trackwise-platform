// /client/src/pages/auth/signup.tsx
console.log("✅ Signup component loaded");
import { useState } from 'react';
import { supabase } from "../../lib/supabase";
import { useLocation } from 'wouter';
import { Container } from '@chakra-ui/react';
import { Heading } from '@chakra-ui/react';
import { Input } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { FormControl } from '@chakra-ui/react';
import { FormLabel } from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';
import { VStack } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';

const Signup = () => {
  console.log("✅ Signup component loaded");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Apprentice');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [, navigate] = useLocation();
navigate("/dashboard");

  const handleSignup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Signup failed', description: error.message, status: 'error' });
    } else {
      toast({ title: 'Signup successful', description: 'Check your email to confirm.', status: 'success' });
      navigate('/login');
    }
  };

  return (
  <div style={{ padding: "2rem", fontSize: "1.5rem" }}>
    ✅ Signup page is rendering
  </div>
);
};

export default Signup;
