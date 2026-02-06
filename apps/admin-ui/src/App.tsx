import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <SnackbarProvider>
            <AppRoutes />
          </SnackbarProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
