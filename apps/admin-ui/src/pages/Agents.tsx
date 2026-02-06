import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  alpha,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  SmartToy,
  Psychology,
  ShoppingCart,
  Search,
  Support,
  Analytics,
  Chat,
} from '@mui/icons-material';
import { agentsApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { AgentMetadata } from '../types';

const AGENT_ICONS: Record<string, React.ReactElement> = {
  LeaderAgent: <Psychology />,
  ProductBrowsingAgent: <Search />,
  ShoppingAgent: <ShoppingCart />,
  CheckoutAgent: <ShoppingCart />,
  ReasoningAgent: <Psychology />,
  CustomerSupportAgent: <Support />,
  AnalyticsAgent: <Analytics />,
  default: <SmartToy />,
};

const CAPABILITY_COLORS: Record<string, string> = {
  SEARCH: 'primary',
  COMPARE: 'secondary',
  CART: 'success',
  CHECKOUT: 'warning',
  SUPPORT: 'info',
  REASONING: 'secondary',
  ANALYTICS: 'default',
  GENERAL_CHAT: 'default',
};

export default function Agents() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await agentsApi.getAll();
      // Sort by priority descending
      const sortedAgents = data.sort((a, b) => b.priority - a.priority);
      setAgents(sortedAgents);
    } catch (error: any) {
      showSnackbar('Failed to load agents', 'error');
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentIcon = (agentName: string) => {
    return AGENT_ICONS[agentName] || AGENT_ICONS.default;
  };

  const getAgentColor = (agentName: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.info.main,
      theme.palette.warning.main,
    ];
    const hash = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const isImplemented = (agentName: string) => {
    const implementedAgents = ['LeaderAgent', 'ProductBrowsingAgent', 'ShoppingAgent'];
    return implementedAgents.includes(agentName);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Multi-Agent System
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View all registered agents and their system prompts in the multi-agent orchestration system
        </Typography>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
          Multi-Agent Architecture POC
        </Typography>
        <Typography variant="body2">
          This system uses specialized agents that work together to handle different aspects of commerce operations.
          Agents can delegate tasks to each other and run searches in parallel for 4x performance improvement.
        </Typography>
      </Alert>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <SmartToy sx={{ color: 'primary.main', fontSize: 32, mb: 1 }} />
            <Typography variant="h4" fontWeight={600}>
              {agents.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Agents
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Chat sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
            <Typography variant="h4" fontWeight={600}>
              {agents.filter(a => isImplemented(a.name)).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Implemented
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Psychology sx={{ color: 'secondary.main', fontSize: 32, mb: 1 }} />
            <Typography variant="h4" fontWeight={600}>
              {agents.reduce((sum, a) => sum + a.capabilities.length, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Capabilities
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Analytics sx={{ color: 'info.main', fontSize: 32, mb: 1 }} />
            <Typography variant="h4" fontWeight={600}>
              {agents[0]?.priority || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max Priority
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Agents List */}
      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid item xs={12} key={agent.name}>
            <Card
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(getAgentColor(agent.name), 0.02),
              }}
            >
              <CardContent>
                {/* Agent Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(getAgentColor(agent.name), 0.15),
                        color: getAgentColor(agent.name),
                      }}
                    >
                      {getAgentIcon(agent.name)}
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {agent.name}
                        </Typography>
                        {isImplemented(agent.name) ? (
                          <Chip label="Implemented" size="small" color="success" />
                        ) : (
                          <Chip label="Not in POC" size="small" color="default" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {agent.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={`Priority: ${agent.priority}`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: alpha(getAgentColor(agent.name), 0.15),
                      color: getAgentColor(agent.name),
                    }}
                  />
                </Box>

                {/* Capabilities */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Capabilities
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {agent.capabilities.map((capability) => (
                      <Chip
                        key={capability}
                        label={capability}
                        size="small"
                        color={(CAPABILITY_COLORS[capability] as any) || 'default'}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                {/* Agent Details */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: '40%' }}>
                              Max Delegations
                            </TableCell>
                            <TableCell>{agent.maxDelegations}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Max Task Depth</TableCell>
                            <TableCell>{agent.maxTaskDepth}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Allowed Delegations
                    </Typography>
                    {agent.allowedDelegations.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {agent.allowedDelegations.map((delegation) => (
                          <Chip
                            key={delegation}
                            label={delegation}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None (self-contained)
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                {/* System Prompt */}
                <Accordion
                  sx={{
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': { display: 'none' },
                    borderRadius: 1,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      bgcolor: alpha(theme.palette.grey[500], 0.05),
                      borderRadius: 1,
                      '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.08) },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      System Prompt
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.grey[900], 0.02),
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        borderRadius: 1,
                      }}
                    >
                      {agent.systemPrompt}
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
