import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { FileText, CheckCircle, XCircle, Clock, ArrowRight, Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDistanceToNow, format } from 'date-fns';
import jsPDF from 'jspdf';

interface Receipt {
  receiptId: string;
  intentId?: string;
  transactionId?: string;
  summary: string;
  why: {
    trigger: string;
    guardOutcome: string;
    route: string;
    amount: number;
    destination: string;
  };
  toolTrace?: Array<{
    step: string;
    timestamp: string;
    result: string;
  }>;
  createdAt: string;
}

interface ReceiptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId?: string;
  transactionId?: string;
}

export function ReceiptDrawer({ open, onOpenChange, intentId, transactionId }: ReceiptDrawerProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && (intentId || transactionId)) {
      loadReceipt();
    } else {
      setReceipt(null);
      setError(null);
    }
  }, [open, intentId, transactionId]);

  const loadReceipt = async () => {
    setLoading(true);
    setError(null);
    try {
      let receiptData: Receipt;
      
      if (transactionId) {
        const response = await apiClient.post<Receipt>(`/receipts/from-transaction/${transactionId}`, {});
        receiptData = response;
      } else if (intentId) {
        const response = await apiClient.post<Receipt>(`/receipts/from-intent/${intentId}`, {});
        receiptData = response;
      } else {
        throw new Error('Either intentId or transactionId is required');
      }
      
      setReceipt(receiptData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
      console.error('Failed to load receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!receipt) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number) => {
      if (yPos + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Helper function to add text with word wrap and page break handling
    const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      const lineHeight = fontSize * 0.4;
      const requiredHeight = lines.length * lineHeight + 5;
      
      checkPageBreak(requiredHeight);
      
      doc.text(lines, margin, yPos);
      yPos += requiredHeight;
    };

    // Title
    addText('Payment Receipt', 20, true);
    yPos += 5;
    addText('AI-generated explanation of this payment', 10, false, [100, 100, 100]);
    yPos += 10;

    // Summary
    addText('Summary', 14, true);
    addText(receipt.summary, 11);
    yPos += 5;

    // Why it happened
    addText('Why it happened', 14, true);
    addText(`Trigger: ${receipt.why.trigger}`, 11);
    addText(`Guard Outcome: ${receipt.why.guardOutcome}`, 11);
    addText(`Route: ${receipt.why.route}`, 11);
    addText(`Amount & Destination: $${receipt.why.amount} to ${receipt.why.destination}`, 11);
    yPos += 5;

    // Tool Trace
    if (receipt.toolTrace && receipt.toolTrace.length > 0) {
      addText('Tool Trace', 14, true);
      receipt.toolTrace.forEach((trace) => {
        const status = trace.result.includes('failed') ? 'Failed' : 
                      trace.result.includes('Completed') ? 'Completed' : 'Pending';
        const timestamp = format(new Date(trace.timestamp), 'MMM dd, yyyy HH:mm:ss');
        addText(`${trace.step}: ${status}`, 11);
        addText(`  ${timestamp} - ${trace.result}`, 10, false, [100, 100, 100]);
      });
      yPos += 5;
    }

    // Identifiers
    addText('Identifiers', 14, true);
    if (receipt.receiptId) {
      addText(`Receipt ID: ${receipt.receiptId}`, 10, false, [100, 100, 100]);
    }
    if (receipt.intentId) {
      addText(`Intent ID: ${receipt.intentId}`, 10, false, [100, 100, 100]);
    }
    if (receipt.transactionId) {
      addText(`Transaction ID: ${receipt.transactionId}`, 10, false, [100, 100, 100]);
    }
    const createdDate = format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm:ss');
    addText(`Created: ${createdDate}`, 10, false, [100, 100, 100]);

    // Generate filename
    const filename = `receipt_${receipt.receiptId || receipt.intentId || receipt.transactionId || 'unknown'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    // Save PDF
    doc.save(filename);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DrawerTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payment Receipt
              </DrawerTitle>
              <DrawerDescription>
                AI-generated explanation of this payment
              </DrawerDescription>
            </div>
            {receipt && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                className="ml-4"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {loading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : error ? (
            <div className="text-sm text-destructive py-4">{error}</div>
          ) : receipt ? (
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-medium mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">{receipt.summary}</p>
              </div>

              <Separator />

              {/* Why it happened */}
              <div>
                <h3 className="text-sm font-medium mb-3">Why it happened</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Trigger:</span>
                      <p className="text-sm text-muted-foreground">{receipt.why.trigger}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Guard Outcome:</span>
                      <p className="text-sm text-muted-foreground">{receipt.why.guardOutcome}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Route:</span>
                      <p className="text-sm text-muted-foreground">{receipt.why.route}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Amount & Destination:</span>
                      <p className="text-sm text-muted-foreground">
                        ${receipt.why.amount} to {receipt.why.destination}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Trace */}
              {receipt.toolTrace && receipt.toolTrace.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Tool Trace</h3>
                    <div className="space-y-2">
                      {receipt.toolTrace.map((trace, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-md">
                          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{trace.step}</span>
                              <Badge variant={trace.result.includes('failed') ? 'destructive' : 'default'}>
                                {trace.result.includes('failed') ? 'Failed' : trace.result.includes('Completed') ? 'Completed' : 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{trace.result}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* IDs */}
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Identifiers</h3>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  {receipt.receiptId && (
                    <div>Receipt ID: {receipt.receiptId}</div>
                  )}
                  {receipt.intentId && (
                    <div>Intent ID: {receipt.intentId}</div>
                  )}
                  {receipt.transactionId && (
                    <div>Transaction ID: {receipt.transactionId}</div>
                  )}
                  <div>Created: {formatDistanceToNow(new Date(receipt.createdAt), { addSuffix: true })}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
