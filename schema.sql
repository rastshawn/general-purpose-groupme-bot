--DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
    `GroupMeUserID` int NOT NULL,
    `Name` varchar(255) NOT NULL,
    PRIMARY KEY (`GroupMeUserID`)
)
;

-- DROP TABLE IF EXISTS `TCount`
CREATE TABLE `TCount` (
    `TCountID` int NOT NULL AUTO_INCREMENT,
    `t` int NOT NULL,
    `time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `GroupMeUserID` int NOT NULL,
    PRIMARY KEY (`TCountID`),
    FOREIGN KEY(`GroupMeUserID`) REFERENCES `User` (`GroupMeUserID`)
)
;
