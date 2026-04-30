import prisma from '../db';

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description: string | null;
}

export const PERMISSIONS: Record<string, string[]> = {
  payments: ['view', 'create', 'edit', 'delete'],
  attendance: ['view', 'create', 'edit'],
  resources: ['view', 'create', 'edit', 'delete'],
  assignments: ['view', 'create', 'edit', 'delete'],
  trainees: ['view', 'create', 'edit', 'delete'],
  sections: ['view', 'create', 'edit', 'delete'],
  notices: ['view', 'create', 'edit', 'delete'],
  teams: ['view', 'create', 'edit', 'delete'],
  notes: ['view', 'create', 'edit', 'delete'],
  applications: ['view', 'create', 'edit', 'delete'],
  interview: ['view', 'create', 'edit', 'delete'],
  timeSlots: ['view', 'create', 'edit', 'delete'],
};

export const MODULES = [
  { key: 'payments', label: 'Payments', icon: 'DollarSign' },
  { key: 'attendance', label: 'Attendance', icon: 'CheckSquare' },
  { key: 'resources', label: 'Resources', icon: 'Folder' },
  { key: 'assignments', label: 'Assignments', icon: 'FileText' },
  { key: 'trainees', label: 'Trainees', icon: 'Users' },
  { key: 'sections', label: 'Sections', icon: 'Users' },
  { key: 'notices', label: 'Notices', icon: 'Bell' },
  { key: 'teams', label: 'Teams', icon: 'Users' },
  { key: 'notes', label: 'Notes', icon: 'FileText' },
  { key: 'applications', label: 'Applications', icon: 'FileText' },
  { key: 'interview', label: 'Interview', icon: 'Calendar' },
  { key: 'timeSlots', label: 'Time Slots', icon: 'Clock' },
];

export async function seedPermissions(): Promise<void> {
  const permissionsToCreate = [];
  
  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    for (const action of actions) {
      permissionsToCreate.push({
        name: `${module}.${action}`,
        module,
        action,
        description: `${action} access for ${module} module`,
      });
    }
  }

  await prisma.permission.deleteMany({});

  for (const perm of permissionsToCreate) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
}

export async function getAllPermissions(): Promise<Permission[]> {
  return prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });
}

export async function getPermissionsByModule(): Promise<Record<string, Permission[]>> {
  const permissions = await getAllPermissions();
  const grouped: Record<string, Permission[]> = {};
  
  for (const perm of permissions) {
    if (!grouped[perm.module]) {
      grouped[perm.module] = [];
    }
    grouped[perm.module].push(perm);
  }
  
  return grouped;
}

export async function getStudentPermissions(studentId: number): Promise<string[]> {
  const studentRoles = await prisma.studentRole.findMany({
    where: { studentId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const sr of studentRoles) {
    for (const rp of sr.role.permissions) {
      permissions.add(rp.permission.name);
    }
  }

  return Array.from(permissions);
}

export async function getStudentAccessibleModules(studentId: number): Promise<string[]> {
  const permissions = await getStudentPermissions(studentId);
  const modules = new Set<string>();
  
  for (const perm of permissions) {
    const module = perm.includes('.') ? perm.split('.')[0] : perm;
    modules.add(module);
  }

  return Array.from(modules);
}

export async function studentHasPermission(studentId: number, permission: string): Promise<boolean> {
  const permissions = await getStudentPermissions(studentId);
  return permissions.includes(permission);
}

export async function checkStudentAccess(
  studentId: number,
  requiredPermission: string
): Promise<boolean> {
  const permissions = await getStudentPermissions(studentId);

  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Backward compatibility: older roles may still store module-only names.
  const [module] = requiredPermission.split('.');
  return permissions.includes(module);
}
