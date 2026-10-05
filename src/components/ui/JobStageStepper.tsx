import React from 'react';
import { JobStage } from '@/config/jobTransitions';
import { Check, Clock, UserCheck, ThumbsUp, Beaker, UploadCloud, Search, CheckCircle2 } from 'lucide-react';

const STAGES: { id: JobStage; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'pending', label: 'Pending', desc: 'Job is pending', icon: Clock },
  { id: 'assigned', label: 'Assigned', desc: 'Assigned to analyst', icon: UserCheck },
  { id: 'accepted', label: 'Accepted', desc: 'Test request accepted', icon: ThumbsUp },
  { id: 'in_testing', label: 'In Testing', desc: 'Testing in progress', icon: Beaker },
  { id: 'report_uploaded', label: 'Report Uploaded', desc: 'Report file uploaded', icon: UploadCloud },
  { id: 'in_review', label: 'In Review', desc: 'Under review', icon: Search },
  { id: 'approved', label: 'Approved', desc: 'Final approval', icon: CheckCircle2 }
];

export function JobStageStepper({ 
  currentStage, 
  isRejected, 
  orientation = 'vertical' 
}: { 
  currentStage: JobStage | 'rejected'; 
  isRejected?: boolean;
  orientation?: 'vertical' | 'horizontal';
}) {
  const actualStage = currentStage === 'rejected' ? 'in_review' : currentStage;
  const isActualRejected = isRejected || currentStage === 'rejected';
  const currentIndex = STAGES.findIndex(s => s.id === actualStage);
  
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`flex w-full font-sans ${isHorizontal ? 'flex-row items-start' : 'flex-col'}`}>
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STAGES.length - 1;
        
        // Define styles
        let circleClasses = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-[2px] bg-white transition-all duration-300 ";
        let titleClasses = "font-bold text-sm leading-tight mt-1 ";
        
        let circleContent = null;
        
        if (isPast || isCurrent) {
          if (isCurrent && isActualRejected) {
            circleClasses += "bg-red-50 border-red-500 text-red-500 shadow-[0_2px_12px_rgba(239,68,68,0.2)]";
            titleClasses += "text-red-600";
            circleContent = <stage.icon className="w-4 h-4" strokeWidth={2.5} />;
          } else {
            circleClasses += isCurrent ? "bg-orange-50 border-orange-500 text-orange-500 shadow-[0_2px_12px_rgba(249,115,22,0.2)] scale-110" : "bg-gradient-to-br from-orange-500 to-orange-400 border-orange-500 text-white shadow-sm";
            titleClasses += isCurrent ? "text-orange-600" : "text-slate-800";
            circleContent = <stage.icon className="w-4 h-4" strokeWidth={isCurrent ? 2.5 : 3} />;
          }
        } else {
          circleClasses += "border-slate-200 text-slate-300 bg-slate-50";
          titleClasses += "text-slate-400";
          circleContent = <stage.icon className="w-4 h-4" strokeWidth={2} />;
        }
        
        return (
          <div key={stage.id} className={`flex relative ${isHorizontal ? 'flex-col items-center flex-1' : 'gap-4'}`}>
            {/* Connecting Line */}
            {!isLast && (
              <div className={`absolute bg-slate-100 ${
                isHorizontal 
                  ? 'h-[2px] left-[50%] right-[-50%] top-4 -z-10' 
                  : 'w-[2px] left-[15px] top-8 bottom-[-8px] -z-10'
              }`}>
                <div className={`bg-orange-500 transition-all duration-500 ${
                  isHorizontal ? 'h-full' : 'w-full'
                }`} style={{
                  width: isHorizontal ? (isPast ? '100%' : '0%') : '100%',
                  height: !isHorizontal ? (isPast ? '100%' : '0%') : '100%',
                }} />
              </div>
            )}
            
            {/* Circle */}
            <div className="relative z-10 flex-shrink-0 mt-0.5 bg-white rounded-full p-0.5">
              <div className={circleClasses}>
                {circleContent}
              </div>
            </div>
            
            {/* Text */}
            <div className={`${isHorizontal ? 'text-center mt-3 px-1' : 'pb-6 pt-1'}`}>
              <p className={titleClasses}>{stage.label}</p>
              {!isHorizontal && <p className="text-xs text-slate-400 leading-tight mt-0.5">{stage.desc}</p>}
              {isCurrent && isActualRejected && (
                <p className="text-[10px] text-red-600 font-bold uppercase mt-1.5 tracking-wider bg-red-100 inline-block px-2 py-0.5 rounded-md">Rejected</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

