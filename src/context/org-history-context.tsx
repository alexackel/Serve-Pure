import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { MockOrganization } from '@/context/organization-context';
import type { EventDetail } from '@/data/mock-events';
import { MOCK_EVENTS } from '@/data/mock-events';
import { MOCK_ORG_HISTORY, type OrgHistoryRecord } from '@/data/mock-org-history';

export type NewEventDraft = {
  title: string;
  date: string;
  hours?: number;
  location: string;
  description?: string;
};

type OrgHistoryContextValue = {
  records: OrgHistoryRecord[];
  customEvents: EventDetail[];
  getOrgEvents: (organizationId: string) => EventDetail[];
  approveRecord: (id: string) => void;
  rejectRecord: (id: string) => void;
  linkRecordToEvent: (id: string, event: EventDetail) => void;
  createEventFromRecord: (id: string, organization: MockOrganization, draft: NewEventDraft) => void;
};

const OrgHistoryContext = createContext<OrgHistoryContextValue | null>(null);

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function OrgHistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<OrgHistoryRecord[]>(MOCK_ORG_HISTORY);
  const [customEvents, setCustomEvents] = useState<EventDetail[]>([]);

  const getOrgEvents = useCallback(
    (organizationId: string) =>
      [...MOCK_EVENTS, ...customEvents].filter((event) => event.organizationId === organizationId),
    [customEvents],
  );

  const approveRecord = useCallback((id: string) => {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status: 'verified' } : record)));
  }, []);

  const rejectRecord = useCallback((id: string) => {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status: 'no-show' } : record)));
  }, []);

  const linkRecordToEvent = useCallback((id: string, event: EventDetail) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, status: 'verified', eventId: event.id, eventTitle: event.title } : record,
      ),
    );
  }, []);

  const createEventFromRecord = useCallback(
    (id: string, organization: MockOrganization, draft: NewEventDraft) => {
      const newEvent: EventDetail = {
        id: `${slugify(draft.title)}-${Date.now()}`,
        title: draft.title,
        organization: organization.name,
        organizationId: organization.id,
        date: draft.date,
        hours: draft.hours,
        location: draft.location,
        description: draft.description,
        status: 'verified',
      };

      setCustomEvents((current) => [...current, newEvent]);
      linkRecordToEvent(id, newEvent);
    },
    [linkRecordToEvent],
  );

  const value = useMemo(
    () => ({
      records,
      customEvents,
      getOrgEvents,
      approveRecord,
      rejectRecord,
      linkRecordToEvent,
      createEventFromRecord,
    }),
    [records, customEvents, getOrgEvents, approveRecord, rejectRecord, linkRecordToEvent, createEventFromRecord],
  );

  return <OrgHistoryContext.Provider value={value}>{children}</OrgHistoryContext.Provider>;
}

export function useOrgHistory() {
  const context = useContext(OrgHistoryContext);
  if (!context) {
    throw new Error('useOrgHistory must be used within an OrgHistoryProvider');
  }
  return context;
}
