import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { monitoringApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { ChatSession, ToolCall, ErrorLog } from '../types';

export default function Monitoring() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 0) {
        const data = await monitoringApi.getSessions({ limit: 100 });
        setSessions(data);
      } else if (tab === 1) {
        const data = await monitoringApi.getToolCalls({ limit: 100 });
        setToolCalls(data);
      } else {
        const data = await monitoringApi.getErrors({ limit: 100 });
        setErrors(data);
      }
    } catch (error: any) {
      showSnackbar('Failed to load monitoring data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sessionColumns: GridColDef[] = [
    { field: 'sessionId', headerName: 'Session ID', flex: 1 },
    { field: 'userId', headerName: 'User ID', flex: 1 },
    { field: 'locale', headerName: 'Locale', width: 100 },
    { field: 'messageCount', headerName: 'Messages', width: 100 },
    { field: 'status', headerName: 'Status', width: 100 },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
  ];

  const toolCallColumns: GridColDef[] = [
    { field: 'toolName', headerName: 'Tool', flex: 1 },
    { field: 'sessionId', headerName: 'Session', flex: 1 },
    { field: 'executionTime', headerName: 'Time (ms)', width: 100 },
    { field: 'success', headerName: 'Success', width: 100, type: 'boolean' },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
  ];

  const errorColumns: GridColDef[] = [
    { field: 'errorType', headerName: 'Type', flex: 1 },
    { field: 'message', headerName: 'Message', flex: 2 },
    { field: 'sessionId', headerName: 'Session', flex: 1 },
    { field: 'resolved', headerName: 'Resolved', width: 100, type: 'boolean' },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Monitoring
      </Typography>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Sessions" />
          <Tab label="Tool Calls" />
          <Tab label="Errors" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={5}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tab === 0 && (
                <DataGrid
                  rows={sessions}
                  columns={sessionColumns}
                  getRowId={(row) => row.sessionId}
                  autoHeight
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                />
              )}
              {tab === 1 && (
                <DataGrid
                  rows={toolCalls}
                  columns={toolCallColumns}
                  getRowId={(row) => row.id}
                  autoHeight
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                />
              )}
              {tab === 2 && (
                <DataGrid
                  rows={errors}
                  columns={errorColumns}
                  getRowId={(row) => row.id}
                  autoHeight
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
