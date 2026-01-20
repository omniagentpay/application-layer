import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { CreatePaymentIntentModal } from '@/components/CreatePaymentIntentModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, ExternalLink } from 'lucide-react';
import { paymentsService } from '@/services/payments';
import type { PaymentIntent } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { InvoicePaymentCard } from '@/components/InvoicePaymentCard';

export default function PaymentIntentsPage() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    loadIntents();
  }, []);

  const loadIntents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentsService.getIntents();
      setIntents(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment intents';
      setError(message);
      console.error('Failed to load intents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadIntents();
  };

  const filteredIntents = intents.filter((intent) => {
    const matchesSearch =
      intent.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intent.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || intent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div>
        <PageHeader title="Payment Intents" />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  if (error && intents.length === 0) {
    return (
      <div>
        <PageHeader title="Payment Intents" />
        <EmptyState
          title="Failed to load payment intents"
          description={error}
          variant="error"
          action={{
            label: 'Retry',
            onClick: loadIntents,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payment Intents"
        description="Manage and track payment requests"
        actions={
          <Button onClick={() => setCreateModalOpen(true)} aria-label="Create new payment intent">
            <Plus className="h-4 w-4 mr-2" />
            New Intent
          </Button>
        }
      />

      <CreatePaymentIntentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Invoice Payment Card */}
      <div className="mb-6">
        <InvoicePaymentCard onIntentCreated={handleCreateSuccess} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search intents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
            aria-label="Search payment intents"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 touch-manipulation" aria-label="Filter by status">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
            <SelectItem value="succeeded">Succeeded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredIntents.length === 0 && !loading ? (
        <EmptyState
          title="No payment intents found"
          description={searchQuery || statusFilter !== 'all' 
            ? "Try adjusting your search or filters"
            : "Create your first payment intent to get started"}
          variant="search"
          action={!searchQuery && statusFilter === 'all' ? { 
            label: 'Create Intent', 
            onClick: () => setCreateModalOpen(true) 
          } : undefined}
        />
      ) : filteredIntents.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Intent</TableHead>
                  <TableHead className="min-w-[180px]">Recipient</TableHead>
                  <TableHead className="min-w-[120px]">Amount</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntents.map((intent) => (
                  <TableRow key={intent.id} className="touch-manipulation">
                    <TableCell>
                      <div>
                        <code className="text-xs font-mono text-muted-foreground break-all">
                          {intent.id}
                        </code>
                        <p className="text-sm mt-0.5 break-words">{intent.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm break-words">{intent.recipient}</p>
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {intent.recipientAddress}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium whitespace-nowrap">
                        ${intent.amount.toLocaleString()} {intent.currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={intent.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(intent.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link to={`/app/intents/${intent.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
