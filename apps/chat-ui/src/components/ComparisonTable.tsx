import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ProductSummary } from '@/types';
import { formatMoney } from '@/utils/format';

interface ComparisonTableProps {
  products: ProductSummary[];
  matrix?: Record<string, string[]>;
}

const ComparisonTable = ({ products, matrix }: ComparisonTableProps) => {
  if (!products.length) return null;
  const keys = matrix ? Object.keys(matrix) : [];
  return (
    <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Feature</TableCell>
            {products.map(product => (
              <TableCell key={`${product.provider}-${product.id}`}>
                <Typography variant="subtitle2">{product.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatMoney(product.price)}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.length ? (
            keys.map(key => (
              <TableRow key={key}>
                <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                {matrix?.[key]?.map((value, index) => (
                  <TableCell key={`${key}-${index}`}>{value}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>Availability</TableCell>
              {products.map(product => (
                <TableCell key={`${product.provider}-${product.id}-availability`}>
                  {product.availability?.status || 'IN_STOCK'}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
};

export default ComparisonTable;
