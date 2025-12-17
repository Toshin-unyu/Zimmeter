import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CheckStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: {
    date: string;
    hasLeft: boolean;
    hasUnstoppedTasks: boolean;
    needsFix: boolean;
    isFixed: boolean;
  } | null;
  uid: string;
}

export const CheckStatusModal = ({ isOpen, onClose, statusData, uid }: CheckStatusModalProps) => {
  const queryClient = useQueryClient();

  const fixMutation = useMutation({
    mutationFn: async () => {
      if (!statusData) return;
      return api.post('/status/fix', { date: statusData.date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusCheck', uid] });
      onClose();
    },
  });

  if (!statusData) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border-2 border-orange-100">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
                    <AlertTriangle size={24} />
                  </div>
                  
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 mb-2">
                    前日の業務ステータス確認
                  </Dialog.Title>

                  <div className="mt-2 text-sm text-gray-500 mb-6 bg-gray-50 p-4 rounded-lg w-full text-left">
                    <p className="font-bold mb-2 text-gray-700">{statusData.date}</p>
                    <ul className="space-y-1">
                      {statusData.hasUnstoppedTasks && (
                        <li className="flex items-center gap-2 text-red-500">
                          <span>•</span> 未停止の業務があります
                        </li>
                      )}
                      {!statusData.hasLeft && (
                        <li className="flex items-center gap-2 text-red-500">
                          <span>•</span> 退社記録がありません
                        </li>
                      )}
                    </ul>
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    昨日の記録を「完了」として補正しますか？
                  </p>

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center rounded-lg border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-colors"
                      onClick={() => fixMutation.mutate()}
                      disabled={fixMutation.isPending}
                    >
                      {fixMutation.isPending ? '処理中...' : '手動補正 (完了とする)'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
