"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { 
  getNotificationsAction, 
  getUnreadNotificationCountAction, 
  markNotificationAsReadAction, 
  markAllNotificationsAsReadAction
} from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";

// Note: Ensure types match or update based on action return structure
interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = () => {
      getUnreadNotificationCountAction().then(res => {
        if (mounted && res.success && 'count' in res && res.count !== undefined) {
          setUnreadCount(res.count as number);
        }
      }).catch(console.error);
    };
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (isOpen) {
      Promise.resolve().then(() => setLoading(true));
      getNotificationsAction().then(res => {
        if (mounted) {
          if (res.success && 'data' in res && res.data) {
            setNotifications(res.data as Notification[]);
          }
          setLoading(false);
        }
      }).catch(err => {
        console.error(err);
        if (mounted) setLoading(false);
      });
    }
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const res = await markAllNotificationsAsReadAction();
    if (res.success) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-zinc-500 hover:text-zinc-900"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="font-semibold text-sm text-zinc-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[350px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-900">No notifications</p>
                <p className="text-xs text-zinc-500 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 transition-colors ${!notification.is_read ? 'bg-orange-50/30' : 'hover:bg-zinc-50/50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 text-sm">
                        <p className={`text-zinc-800 ${!notification.is_read ? 'font-medium' : ''}`}>
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="flex-shrink-0 p-1.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
