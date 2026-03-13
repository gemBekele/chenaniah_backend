import prisma from '../db';

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description: string | null;
}

export const PERMISSIONS = {
  payments: ['payments'],
  attendance: ['attendance'],
  resources: ['resources'],
  assignments: ['assignments'],
  trainees: ['trainees'],
  sections: ['sections'],
  notices: ['notices'],
  teams: ['teams'],
  notes: ['notes'],
  applications: ['applications'],
  interview: ['interview'],
  timeSlots: ['timeSlots'],
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
  
  for (const [module, perms] of Object.entries(PERMISSIONS)) {
    for (const perm of perms) {
      permissionsToCreate.push({
        name: perm,
        module: perm,
        action: 'access',
        description: `Access to ${perm} module`,
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
    const [module] = perm.split('.');
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
  
  const [module] = requiredPermission.split('.');
  
  for (const perm of permissions) {
    if (perm === module) {
      return true;
    }
  }
  
  return false;
}
