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

func fetchSummaries(db *sql.DB, period string, year, month int, full bool) ([]models.FinancialSummary, error) {
	var query string
	var args []interface{}

	y := strconv.Itoa(year)
	m := fmt.Sprintf("%02d", month)

	// When not full: hide every 5th transaction (id % 5 == 0) → shows ~80%
	sFilter := "AND s.id % 5 != 0"
	wFilter := "AND w.id % 5 != 0"
	if full {
		sFilter = ""
		wFilter = ""
	}

	switch period {
	case "daily":
		query = fmt.Sprintf(`
			SELECT strftime('%%d', dt, 'localtime'),
			       COALESCE(SUM(tc),0), COALESCE(SUM(fc),0),
			       COALESCE(SUM(tot),0), COUNT(*)
			FROM (
			  SELECT ended_at AS dt, table_charge AS tc, fnb_charge AS fc, total_amount AS tot
			  FROM sessions s WHERE s.status='completed' %s
			    AND strftime('%%Y', ended_at, 'localtime') = ?
			    AND strftime('%%m', ended_at, 'localtime') = ?
			  UNION ALL
			  SELECT created_at AS dt, 0 AS tc, total AS fc, total AS tot
			  FROM walkin_orders w WHERE 1=1 %s
			  AND strftime('%%Y', created_at, 'localtime') = ?
			    AND strftime('%%m', created_at, 'localtime') = ?
			)
			GROUP BY 1 ORDER BY 1
		`, sFilter, wFilter)
		args = []interface{}{y, m, y, m}
	case "weekly":
		query = fmt.Sprintf(`
			SELECT 'Week ' || strftime('%%W', dt, 'localtime'),
			       COALESCE(SUM(tc),0), COALESCE(SUM(fc),0),
			       COALESCE(SUM(tot),0), COUNT(*)
			FROM (
			  SELECT ended_at AS dt, table_charge AS tc, fnb_charge AS fc, total_amount AS tot
			  FROM sessions s WHERE s.status='completed' %s
			    AND strftime('%%Y', ended_at, 'localtime') = ?
			    AND strftime('%%m', ended_at, 'localtime') = ?
			  UNION ALL
			  SELECT created_at AS dt, 0 AS tc, total AS fc, total AS tot
			  FROM walkin_orders w WHERE 1=1 %s
			    AND strftime('%%Y', created_at, 'localtime') = ?
			    AND strftime('%%m', created_at, 'localtime') = ?
			)
			GROUP BY 1 ORDER BY 1
		`, sFilter, wFilter)
		args = []interface{}{y, m, y, m}
	case "monthly":
		query = fmt.Sprintf(`
			SELECT strftime('%%m', dt, 'localtime'),
			       COALESCE(SUM(tc),0), COALESCE(SUM(fc),0),
			       COALESCE(SUM(tot),0), COUNT(*)
			FROM (
			  SELECT ended_at AS dt, table_charge AS tc, fnb_charge AS fc, total_amount AS tot
			  FROM sessions s WHERE s.status='completed' %s
			    AND strftime('%%Y', ended_at, 'localtime') = ?
			  UNION ALL
			  SELECT created_at AS dt, 0 AS tc, total AS fc, total AS tot
			  FROM walkin_orders w WHERE 1=1 %s
			    AND strftime('%%Y', created_at, 'localtime') = ?
			)
			GROUP BY 1 ORDER BY 1
		`, sFilter, wFilter)
		args = []interface{}{y, y}
	case "yearly":
		query = fmt.Sprintf(`
			SELECT strftime('%%Y', dt, 'localtime'),
			       COALESCE(SUM(tc),0), COALESCE(SUM(fc),0),
			       COALESCE(SUM(tot),0), COUNT(*)
			FROM (
			  SELECT ended_at AS dt, table_charge AS tc, fnb_charge AS fc, total_amount AS tot
			  FROM sessions s WHERE s.status='completed' %s
			  UNION ALL
			  SELECT created_at AS dt, 0 AS tc, total AS fc, total AS tot
			  FROM walkin_orders w WHERE 1=1 %s
			)
			GROUP BY 1 ORDER BY 1
		`, sFilter, wFilter)
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
			mn, _ := strconv.Atoi(raw)
			if mn >= 1 && mn <= 12 {
				s.Period = monthNames[mn-1]
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
