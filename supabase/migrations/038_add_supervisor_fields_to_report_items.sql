-- Add manager comment and deadline to weekly report items
ALTER TABLE weekly_report_items
ADD COLUMN manager_comment text,
ADD COLUMN deadline date;
