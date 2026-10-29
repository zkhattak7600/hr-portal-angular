import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { adminGuard, authGuard, employeeGuard, guestGuard, roleHomeRedirect } from './core/guards/auth.guard';

const legacy = ['dashboard', 'employees', 'departments', 'leaves', 'attendance', 'payroll'];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => roleHomeRedirect() },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Login | HR Portal' },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard], title: 'Register | HR Portal' },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [guestGuard], title: 'Forgot password | HR Portal' },
  {
    path: 'admin',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard, adminGuard],
    canActivateChild: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', title: 'Dashboard | HR Portal', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'employees', title: 'Employees | HR Portal', loadComponent: () => import('./pages/employees/employees.component').then(m => m.EmployeesComponent) },
      { path: 'departments', title: 'Departments | HR Portal', loadComponent: () => import('./pages/departments/departments.component').then(m => m.DepartmentsComponent) },
      { path: 'leaves', title: 'Leave | HR Portal', loadComponent: () => import('./pages/leaves/leaves.component').then(m => m.LeavesComponent) },
      { path: 'attendance', title: 'Attendance | HR Portal', loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'payroll', title: 'Payroll | HR Portal', loadComponent: () => import('./pages/payroll/payroll.component').then(m => m.PayrollComponent) }
    ]
  },
  {
    path: 'employee',
    loadComponent: () => import('./employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    canActivate: [authGuard, employeeGuard],
    canActivateChild: [authGuard, employeeGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', title: 'My Dashboard | HR Portal', loadComponent: () => import('./pages/employee/my-dashboard/my-dashboard.component').then(m => m.MyDashboardComponent) },
      { path: 'profile', title: 'My Profile | HR Portal', loadComponent: () => import('./pages/employee/my-profile/my-profile.component').then(m => m.MyProfileComponent) },
      { path: 'leaves', title: 'My Leaves | HR Portal', loadComponent: () => import('./pages/employee/my-leaves/my-leaves.component').then(m => m.MyLeavesComponent) },
      { path: 'attendance', title: 'My Attendance | HR Portal', loadComponent: () => import('./pages/employee/my-attendance/my-attendance.component').then(m => m.MyAttendanceComponent) },
      { path: 'payslips', title: 'My Payslips | HR Portal', loadComponent: () => import('./pages/employee/my-payslips/my-payslips.component').then(m => m.MyPayslipsComponent) }
    ]
  },
  // Old paths -> admin equivalents
  ...legacy.map(p => ({ path: p, redirectTo: `/admin/${p}`, pathMatch: 'full' as const })),
  { path: '**', redirectTo: '' }
];
