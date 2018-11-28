DROP PROCEDURE week_average;
DELIMITER //
CREATE PROCEDURE week_average()
BEGIN
    SELECT User.Name, AVG(TCount.t) AS AverageT, COUNT(TCount.t) AS numRecords FROM TCount
        JOIN User ON User.GroupMeUserID = TCount.GroupMeUserID
        WHERE TCount.time BETWEEN (DATE(NOW()) - INTERVAL 6 DAY) AND NOW() -- 6 days instead of 7 because users complained when it returned eight records
        GROUP BY User.Name
        ORDER BY AverageT DESC;
END //
DELIMITER ;
