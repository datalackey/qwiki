replace-me as passwd. change !


docker compose up -d

ConfirmEdit extension (CAPTCHA on edit/account-creation) to cut down bot/spam vandalism specifically — bundled with MediaWiki, just needs enabling in LocalSettings.php



docker exec -it $(docker compose ps -q mediawiki) php maintenance/changePassword.php --user="Admin" --password="AdminPass123"


this line should be removed from config
echo '$wgShowExceptionDetails = true;' >> LocalSettings.php

