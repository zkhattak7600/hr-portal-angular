export type EmployeeStatus = 'Active' | 'Inactive';
export type LeaveType = 'Annual' | 'Sick' | 'Casual' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'Leave';
export type PayslipStatus = 'Draft' | 'Paid';

export interface Department { id: number; name: string; description: string | null; createdAt: string; employeeCount: number; }
export interface DepartmentSave { name: string; description: string | null; }

export interface Employee {
  id: number; employeeCode: string; firstName: string; lastName: string; fullName: string;
  email: string; phone: string | null; designation: string | null; departmentId: number;
  departmentName: string; joiningDate: string; basicSalary: number; status: EmployeeStatus;
  userId: number | string | null;
  photoUrl?: string | null;
}
export interface EmployeeSave {
  firstName: string; lastName: string; email: string; phone: string | null; designation: string | null;
  departmentId: number; joiningDate: string; basicSalary: number; status: EmployeeStatus;
  userId?: number | string | null;
}
export interface EmployeeQuery { search?: string; departmentId?: number | string | null; status?: string | null; }

export interface Leave {
  id: number; employeeId: number; employeeName: string; employeeCode: string; leaveType: LeaveType;
  startDate: string; endDate: string; days: number; reason: string | null; status: LeaveStatus;
  adminRemarks: string | null; createdAt: string;
}
export interface LeaveCreate { employeeId: number; leaveType: LeaveType; startDate: string; endDate: string; reason: string; }

export interface Attendance {
  id: number; employeeId: number; employeeName: string; employeeCode: string; date: string;
  checkIn: string | null; checkOut: string | null; status: AttendanceStatus; notes: string | null;
}
export interface AttendanceSave {
  employeeId: number; date: string; checkIn: string | null; checkOut: string | null;
  status: AttendanceStatus; notes: string | null;
}
export interface AttendanceSummary {
  employeeId: number; month: number; year: number; present: number; absent: number;
  late: number; halfDay: number; leave: number; total: number;
}

export interface Payslip {
  id: number; employeeId: number; employeeName: string; employeeCode: string; departmentName: string;
  month: number; year: number; basicSalary: number; allowances: number; deductions: number; tax: number;
  netSalary: number; status: PayslipStatus; generatedAt: string; paidAt: string | null;
}
export interface PayrollGenerate { month: number; year: number; allowances?: number | null; deductions?: number | null; tax?: number | null; }
export interface PayrollGenerateResult { generated: number; skipped: number; payslips: Payslip[]; }
export interface PayslipCreate {
  employeeId: number; month: number; year: number; basicSalary?: number | null;
  allowances?: number | null; deductions?: number | null; tax?: number | null;
}
export interface PayslipUpdate { basicSalary: number; allowances: number; deductions: number; tax: number; }

export interface DashboardStats {
  totalEmployees: number; activeEmployees: number; totalDepartments: number; pendingLeaves: number;
  todayPresent: number; todayAbsent: number; currentMonthPayroll: number;
}

export interface MyDashboard {
  pendingLeaves: number; approvedLeaves: number; rejectedLeaves: number; leaveDaysTakenThisYear: number;
  attendance: AttendanceSummary; latestNetSalary: number | null; latestPayslipMonth: number | null; latestPayslipYear: number | null;
}
export interface MyAttendanceToday extends Attendance { workedHours: number | null; }

/** GET /api/me/leave-balance item (days, current year). */
export interface LeaveBalance { type: LeaveType; entitled: number; used: number; pending: number; remaining: number; }
