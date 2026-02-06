import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0b62ff',
    },
    secondary: {
      main: '#00a389',
    },
    background: {
      default: '#f5f7fb',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
  },
});

export default theme;
