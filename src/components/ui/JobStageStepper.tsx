import React from 'react';
import { JobStage } from '@/config/jobTransitions';
import { Check, Circle, Clock } from 'lucide-react';

const STAGES: { id: JobStage; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'in_testing', label: 'In Testing' },
  { id: 'report_uploaded', label: 'Report Uploaded' },
  { id: 'in_review', label: 'In Review' },
  { id: 'approved', label: 'Approved' }
];

export function JobStageStepper({ currentStage, isRejected }: { currentStage: JobStage | 'rejected'; isRejected?: boolean }) {
  const actualStage = currentStage === 'rejected' ? 'in_review' : currentStage;
  const isActualRejected = isRejected || currentStage === 'rejected';
  const currentIndex = STAGES.findIndex(s => s.id === actualStage);
  
  return (
    <div className="flex items-center space-x-1 w-full mt-2 overflow-x-auto py-2">
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        let colorClass = 'text-slate-300';
        let bgClass = 'bg-slate-200';
        
        if (isPast) {
          colorClass = 'text-green-500';
          bgClass = 'bg-green-500';
        } else if (isCurrent) {
          if (isActualRejected) {
            colorClass = 'text-red-500';
            bgClass = 'bg-red-500';
          } else {
            colorClass = 'text-orange-500';
            bgClass = 'bg-orange-500';
          }
        }
        
        return (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center min-w-[60px]">
              <div className="flex items-center justify-center">
                {isPast ? (
                  <Check className={`w-4 h-4 ${colorClass}`} />
                ) : isCurrent ? (
                  <Circle className={`w-4 h-4 fill-current ${colorClass}`} />
                ) : (
                  <Circle className={`w-4 h-4 ${colorClass}`} />
                )}
              </div>
              <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${isCurrent ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                {stage.label}
                {isCurrent && isActualRejected && (
                  <span className="block text-[9px] text-red-500 font-bold mt-0.5">Rejected</span>
                )}
              </span>
            </div>
            {index < STAGES.length - 1 && (
              <div className={`h-[2px] flex-1 min-w-[20px] mb-4 ${isPast ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
