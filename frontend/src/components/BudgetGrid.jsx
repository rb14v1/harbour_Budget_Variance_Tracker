import { useMemo, useState } from 'react';
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { FISCAL_MONTH_LABELS } from '../utils/fiscal';
import { formatPaise } from '../utils/format';
import { computeTotals } from '../utils/budget';

const rupeeNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

// Pinned/aggregation rows are paid DataGrid features, so totals live in a custom footer slot.
export function BudgetTotalsFooter({ totals }) {
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1, overflowX: 'auto' }} data-testid="budget-totals">
      <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', minWidth: 'max-content' }}>
        <Typography variant="subtitle2" sx={{ minWidth: 80 }}>
          Total
        </Typography>
        {totals.monthTotals.map((t, i) => (
          <Box key={FISCAL_MONTH_LABELS[i]} sx={{ textAlign: 'right', minWidth: 90 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {FISCAL_MONTH_LABELS[i]}
            </Typography>
            <Typography variant="body2">{formatPaise(t)}</Typography>
          </Box>
        ))}
        <Box sx={{ textAlign: 'right', minWidth: 130 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Year
          </Typography>
          <Typography variant="subtitle2" data-testid="grand-total">
            {formatPaise(totals.grandTotal)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function BudgetGrid({ lines, categories, editable, onChange }) {
  const [newCategory, setNewCategory] = useState('');
  const catById = useMemo(() => new Map((categories || []).map((c) => [c._id, c])), [categories]);
  const totals = useMemo(() => computeTotals(lines), [lines]);

  const rows = lines.map((l, idx) => {
    const row = { id: l.categoryId, category: catById.get(l.categoryId)?.name || 'Unknown category', total: totals.rowTotals[idx] };
    l.monthly.forEach((v, i) => {
      row[`m${i}`] = v;
    });
    return row;
  });

  const columns = [
    { field: 'category', headerName: 'Category', width: 170, sortable: false },
    ...FISCAL_MONTH_LABELS.map((label, i) => ({
      field: `m${i}`,
      headerName: label,
      type: 'number',
      width: 110,
      sortable: false,
      editable,
      valueGetter: (value) => value / 100,
      valueSetter: (value, row) => ({ ...row, [`m${i}`]: Math.max(0, Math.round(Number(value || 0) * 100)) }),
      valueFormatter: (value) => rupeeNumber.format(value ?? 0),
    })),
    {
      field: 'total',
      headerName: 'Year total',
      width: 150,
      sortable: false,
      type: 'number',
      valueFormatter: (value) => formatPaise(value),
    },
    ...(editable
      ? [
          {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            renderCell: (params) => (
              <Tooltip title="Remove line">
                <IconButton size="small" aria-label="remove line" onClick={() => onChange(lines.filter((l) => l.categoryId !== params.id))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  const processRowUpdate = (newRow) => {
    onChange(lines.map((l) => (l.categoryId === newRow.id ? { ...l, monthly: FISCAL_MONTH_LABELS.map((_, i) => newRow[`m${i}`]) } : l)));
    return newRow;
  };

  const available = (categories || []).filter((c) => !lines.some((l) => l.categoryId === c._id));

  return (
    <Box>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight
        disableColumnMenu
        disableRowSelectionOnClick
        hideFooterPagination
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={() => {}}
        slots={{ footer: BudgetTotalsFooter }}
        slotProps={{ footer: { totals } }}
        localeText={{ noRowsLabel: editable ? 'Add a category line to start' : 'No budget lines' }}
        sx={{ bgcolor: 'background.paper' }}
      />
      {editable && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField select size="small" label="Add category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} sx={{ minWidth: 240 }}>
            {available.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name} ({c.type})
              </MenuItem>
            ))}
          </TextField>
          <Button
            startIcon={<AddIcon />}
            disabled={!newCategory}
            onClick={() => {
              onChange([...lines, { categoryId: newCategory, monthly: Array(12).fill(0) }]);
              setNewCategory('');
            }}
          >
            Add line
          </Button>
        </Stack>
      )}
    </Box>
  );
}
