import React, { useEffect, useState } from 'react';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import { FiCreditCard, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

interface IPaymentRecord {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  receipt: string;
  createdAt: string;
}

export const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<IPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/payments/history');
        if (res.data?.status === 'success') {
          setPayments(res.data.data);
        }
      } catch (err) {
        toast.error('Could not load payment history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <FiCheckCircle className="text-xs" /> Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <FiXCircle className="text-xs" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <FiClock className="text-xs" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xl">
          <FiCreditCard />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Transactions</h3>
          <p className="text-xs text-gray-500">Record of all Razorpay payments for your campus rides.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading payment history...</div>
      ) : payments.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">No payment transactions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-750 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                  <td className="py-3.5 px-4 font-mono text-xs">{p.receipt}</td>
                  <td className="py-3.5 px-4 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">₹{p.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-xs">{p.method || 'UPI/Card'}</td>
                  <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
