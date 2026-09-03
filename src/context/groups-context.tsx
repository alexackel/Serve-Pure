import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { CURRENT_USER } from '@/data/current-user';
import { MOCK_GROUPS, type MockGroup } from '@/data/mock-groups';

const SEED_MY_GROUP_IDS = ['riverside-high-key-club', 'greenfuture-youth-corps'];

type GroupsContextValue = {
  groups: MockGroup[];
  myGroupIds: string[];
  createGroup: (name: string) => string;
  deleteGroup: (groupId: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
  isAdmin: (groupId: string) => boolean;
  approveMemberRecord: (groupId: string, memberId: string, recordId: string) => void;
  rejectMemberRecord: (groupId: string, memberId: string, recordId: string) => void;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<MockGroup[]>(MOCK_GROUPS);
  const [myGroupIds, setMyGroupIds] = useState<string[]>(SEED_MY_GROUP_IDS);

  const createGroup = useCallback((name: string) => {
    const id = `${slugify(name)}-${Date.now()}`;
    const newGroup: MockGroup = {
      id,
      name,
      memberCount: 1,
      adminIds: [CURRENT_USER.id],
      members: [{ id: CURRENT_USER.id, name: CURRENT_USER.name, records: [] }],
    };

    setGroups((current) => [...current, newGroup]);
    setMyGroupIds((current) => [...current, id]);

    return id;
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setGroups((current) => current.filter((group) => group.id !== groupId));
    setMyGroupIds((current) => current.filter((id) => id !== groupId));
  }, []);

  const removeMember = useCallback((groupId: string, memberId: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          memberCount: Math.max(0, group.memberCount - 1),
          members: group.members.filter((member) => member.id !== memberId),
        };
      }),
    );
  }, []);

  const isAdmin = useCallback(
    (groupId: string) => groups.find((group) => group.id === groupId)?.adminIds?.includes(CURRENT_USER.id) ?? false,
    [groups],
  );

  const approveMemberRecord = useCallback((groupId: string, memberId: string, recordId: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          members: group.members.map((member) => {
            if (member.id !== memberId) return member;
            return {
              ...member,
              records: member.records.map((record) =>
                record.id === recordId ? { ...record, status: 'admin-approved' } : record,
              ),
            };
          }),
        };
      }),
    );
  }, []);

  const rejectMemberRecord = useCallback((groupId: string, memberId: string, recordId: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          members: group.members.map((member) => {
            if (member.id !== memberId) return member;
            return {
              ...member,
              records: member.records.map((record) =>
                record.id === recordId ? { ...record, status: 'no-show' } : record,
              ),
            };
          }),
        };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({
      groups,
      myGroupIds,
      createGroup,
      deleteGroup,
      removeMember,
      isAdmin,
      approveMemberRecord,
      rejectMemberRecord,
    }),
    [groups, myGroupIds, createGroup, deleteGroup, removeMember, isAdmin, approveMemberRecord, rejectMemberRecord],
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
}
