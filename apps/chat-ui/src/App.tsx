import { CssBaseline, ThemeProvider } from '@mui/material';
import ChatApp from '@/components/ChatApp';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatApp />
    </ThemeProvider>
  );
};

export default App;
