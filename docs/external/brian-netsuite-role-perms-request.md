# NetSuite Role Permissions Request — C-Suite Integration

Hi Brian,

The C-Suite app connects to NetSuite via Token-Based Authentication (TBA) under the role currently assigned to the integration token. That role can read `transaction` and `subsidiary` via SuiteQL, but the following tables return HTTP 400 "Record not found" — which is how NetSuite reports insufficient role permission (not a missing record). These tables are required for the cash position, payroll, and covenant queries the app runs.

Please grant **View** permission on each table below.

## Required Permissions

| Table | NetSuite UI Name | Permission Level | Business Justification |
|---|---|---|---|
| `account` | Accounts | View | Cash position queries join `transaction` to `account` to label bank/GL accounts; without it, cash reports show unlabeled amounts |
| `department` | Departments | View | Payroll cost queries group headcount spend by department (GTM vs R&D vs G&A split used in GTM Reallocation and Board Narrative playbooks) |
| `classification` | Classifications | View | Segment-level P&L queries (class = product line or cost center) required for Board Narrative financial breakdown |
| `employee` | Employees | View | Headcount and payroll queries identify active employee count and compensation by role; used in Restructure Decision playbook |
| `accountingperiod` | Accounting Periods | View | Period-based cash and budget variance queries require period ID to join transactions to calendar months and fiscal periods |

## NetSuite UI Path

1. **Setup → Users/Roles → Manage Roles**
2. Click **Edit** on the role assigned to the C-Suite TBA token
3. Go to the **Permissions** tab
4. Under **Lists** sub-tab: add `Accounts`, `Departments`, `Classifications`, `Employees`, `Accounting Periods` — each at **View** level
5. Save

The token account ID is **603734**. You can verify the current token role via: Setup → Users/Roles → Access Tokens → find token with description "C-Suite Integration".

No admin-level or write permissions are needed — View is sufficient for all five tables.

Thanks,
Russell
