import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useSession } from '../context/SessionContext';
import { errorMessage } from '../api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'grey.100', p: 2 }}>
      <Card sx={{ width: 400, maxWidth: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Budget & Variance Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in with your finance account
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField label="Email" fullWidth margin="normal" autoComplete="username" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={isSubmitting}>
              Sign in
            </Button>
          </Box>
          {import.meta.env.DEV && (
            <Alert severity="info" sx={{ mt: 3 }}>
              Demo: admin@demo.com, cfo@demo.com, fm@demo.com, head.eng@demo.com, viewer@demo.com — password Password@123
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
