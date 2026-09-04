import { EventItem, PaymentRecord, ReminderItem, ExpenseItem } from '../types.ts';
import {
  loadEventsFromStorage,
  saveEventsToStorage,
  loadRemindersFromStorage,
  saveRemindersToStorage,
  loadExpensesFromStorage,
  saveExpensesToStorage,
} from './storage.ts';

// Get current auth token if user is signed in
let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

// Fetch all events from backend (with storage fallback)
export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const res = await fetch('/api/events', {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data: EventItem[] = await res.json();
    if (Array.isArray(data)) {
      const sanitized = data.map((event) => {
        if (event.location && event.location.toLowerCase().includes('candy')) {
          return { ...event, location: 'Candy Salón de Eventos' };
        }
        return event;
      });
      saveEventsToStorage(sanitized);
      return sanitized;
    }
    return loadEventsFromStorage();
  } catch (err) {
    console.warn('Using local cached events due to network error:', err);
    return loadEventsFromStorage();
  }
}

// Save event to backend
export async function saveEventApi(event: EventItem): Promise<void> {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.warn('Failed to persist event to server, cached locally.');
    }
  } catch (err) {
    console.warn('Network error saving event to server:', err);
  }
}

// Delete event from backend
export async function deleteEventApi(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn('Failed to delete event from server');
    }
  } catch (err) {
    console.warn('Network error deleting event from server:', err);
  }
}

// Add payment to backend
export async function addPaymentApi(eventId: string, payment: PaymentRecord): Promise<void> {
  try {
    const res = await fetch(`/api/events/${eventId}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payment),
    });
    if (!res.ok) {
      console.warn('Failed to add payment on server');
    }
  } catch (err) {
    console.warn('Network error adding payment:', err);
  }
}

// Fetch all reminders from backend
export async function fetchReminders(): Promise<ReminderItem[]> {
  try {
    const res = await fetch('/api/reminders', {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data: ReminderItem[] = await res.json();
    if (Array.isArray(data)) {
      saveRemindersToStorage(data);
      return data;
    }
    return loadRemindersFromStorage();
  } catch (err) {
    console.warn('Using local cached reminders due to network error:', err);
    return loadRemindersFromStorage();
  }
}

// Save reminder to backend
export async function saveReminderApi(reminder: ReminderItem): Promise<void> {
  try {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reminder),
    });
    if (!res.ok) {
      console.warn('Failed to save reminder on server');
    }
  } catch (err) {
    console.warn('Network error saving reminder:', err);
  }
}

// Delete reminder from backend
export async function deleteReminderApi(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn('Failed to delete reminder on server');
    }
  } catch (err) {
    console.warn('Network error deleting reminder:', err);
  }
}

// Fetch all expenses from backend
export async function fetchExpenses(): Promise<ExpenseItem[]> {
  try {
    const res = await fetch('/api/expenses', {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data: ExpenseItem[] = await res.json();
    if (Array.isArray(data)) {
      saveExpensesToStorage(data);
      return data;
    }
    return loadExpensesFromStorage();
  } catch (err) {
    console.warn('Using local cached expenses due to network error:', err);
    return loadExpensesFromStorage();
  }
}

// Save expense to backend
export async function saveExpenseApi(expense: ExpenseItem): Promise<void> {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      console.warn('Failed to save expense on server');
    }
  } catch (err) {
    console.warn('Network error saving expense:', err);
  }
}

// Delete expense from backend
export async function deleteExpenseApi(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn('Failed to delete expense on server');
    }
  } catch (err) {
    console.warn('Network error deleting expense:', err);
  }
}

// Reset demo data on backend
export async function resetDemoApi(): Promise<{ events: EventItem[]; reminders: ReminderItem[]; expenses: ExpenseItem[] } | null> {
  try {
    const res = await fetch('/api/reset-demo', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.events && data.reminders) {
        saveEventsToStorage(data.events);
        saveRemindersToStorage(data.reminders);
        if (data.expenses) {
          saveExpensesToStorage(data.expenses);
        }
        return { events: data.events, reminders: data.reminders, expenses: data.expenses || loadExpensesFromStorage() };
      }
    }
  } catch (err) {
    console.warn('Failed to reset demo on server:', err);
  }
  return null;
}

// Clear all events, reminders, expenses and payments from backend & local storage
export async function clearAllDataApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/clear-all', {
      method: 'POST',
      headers: getHeaders(),
    });
    saveEventsToStorage([]);
    saveRemindersToStorage([]);
    saveExpensesToStorage([]);
    return res.ok;
  } catch (err) {
    console.warn('Failed to clear database on server, clearing locally:', err);
    saveEventsToStorage([]);
    saveRemindersToStorage([]);
    saveExpensesToStorage([]);
    return false;
  }
}
