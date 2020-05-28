    SELECT User.Name, AVG(TCount.t) AS AverageT, COUNT(TCount.t) AS numRecords FROM TCount
        JOIN User ON User.GroupMeUserID = TCount.GroupMeUserID
        WHERE TCount.time BETWEEN (DATE(NOW()) - INTERVAL 7 DAY) AND NOW()
        GROUP BY User.Name
        ORDER BY AverageT DESC;
