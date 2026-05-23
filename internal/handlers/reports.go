package handlers

import (
	"database/sql"
	"fmt"
	"strconv"

	"room9/internal/models"
)

var monthNames = []string{
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
}

func fetchSummaries(db *sql.DB, period string, year, month int) ([]models.FinancialSummary, error) {
	var query string
	var args []interface{}

	switch period {
	case "daily":
		query = `
			SELECT strftime('%d', ended_at, 'localtime'),
			       COALESCE(SUM(table_charge),0), COALESCE(SUM(fnb_charge),0),
			       COALESCE(SUM(total_amount),0), COUNT(*)
			FROM sessions WHERE status='completed'
			  AND strftime('%Y', ended_at, 'localtime') = ?
			  AND strftime('%m', ended_at, 'localtime') = ?
			GROUP BY 1 ORDER BY 1
		`
		args = []interface{}{strconv.Itoa(year), fmt.Sprintf("%02d", month)}
	case "weekly":
		query = `
			SELECT 'Week ' || strftime('%W', ended_at, 'localtime'),
			       COALESCE(SUM(table_charge),0), COALESCE(SUM(fnb_charge),0),
			       COALESCE(SUM(total_amount),0), COUNT(*)
			FROM sessions WHERE status='completed'
			  AND strftime('%Y', ended_at, 'localtime') = ?
			  AND strftime('%m', ended_at, 'localtime') = ?
			GROUP BY 1 ORDER BY 1
		`
		args = []interface{}{strconv.Itoa(year), fmt.Sprintf("%02d", month)}
	case "monthly":
		query = `
			SELECT strftime('%m', ended_at, 'localtime'),
			       COALESCE(SUM(table_charge),0), COALESCE(SUM(fnb_charge),0),
			       COALESCE(SUM(total_amount),0), COUNT(*)
			FROM sessions WHERE status='completed'
			  AND strftime('%Y', ended_at, 'localtime') = ?
			GROUP BY 1 ORDER BY 1
		`
		args = []interface{}{strconv.Itoa(year)}
	case "yearly":
		query = `
			SELECT strftime('%Y', ended_at, 'localtime'),
			       COALESCE(SUM(table_charge),0), COALESCE(SUM(fnb_charge),0),
			       COALESCE(SUM(total_amount),0), COUNT(*)
			FROM sessions WHERE status='completed'
			GROUP BY 1 ORDER BY 1
		`
	default:
		return nil, nil
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := []models.FinancialSummary{}
	for rows.Next() {
		var s models.FinancialSummary
		var raw string
		rows.Scan(&raw, &s.TableCharge, &s.FnbCharge, &s.Total, &s.Sessions)
		switch period {
		case "daily":
			s.Period = raw
		case "weekly":
			s.Period = raw
		case "monthly":
			m, _ := strconv.Atoi(raw)
			if m >= 1 && m <= 12 {
				s.Period = monthNames[m-1]
			} else {
				s.Period = raw
			}
		case "yearly":
			s.Period = raw
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}
