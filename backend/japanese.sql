-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 09, 2026 at 08:56 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `japanese`
--

-- --------------------------------------------------------

--
-- Table structure for table `heart_transactions`
--

CREATE TABLE `heart_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `change_amount` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `heart_transactions`

INSERT INTO `heart_transactions` (`id`, `user_id`, `change_amount`, `reason`, `created_at`) VALUES
;

-- --------------------------------------------------------

--
-- Table structure for table `chat_history`
--

CREATE TABLE `chat_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `user_msg` text DEFAULT NULL,
  `ai_reply` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_history`
--

INSERT INTO `chat_history` (`id`, `user_id`, `user_msg`, `ai_reply`, `timestamp`) VALUES
(1, NULL, 'こんにちは。', 'こんにちは！ | Chào bạn!\n\n元気ですか？ | Bạn có khỏe không?', '2026-04-29 11:14:43'),
(2, NULL, '幸せな気持ちです。', '私もそうです。海ではすごく幸せな気持ちになります。 | Tôi cũng có cảm giác như vậy. Tôi cảm thấy vô cùng hạnh phúc khi ở ngoài biển.\n\nお母さんも幸せな気持ちですか？ | Mẹ của bạn có cảm giác hạnh phúc không?', '2026-04-29 11:14:53'),
(3, NULL, 'おはようです。', 'おはようございます。元気ですか？ | Bạn chào buổi sáng. Bạn có khỏe không?', '2026-05-01 12:39:14'),
(4, NULL, '元気です。', 'いいえ、今日は海で泳ぎます | Tôi không, tôi sẽ bơi biển hôm nay.\n\n海が好きですか | Bạn thích biển không?', '2026-05-01 12:39:33'),
(5, NULL, 'はい', '今日はいい天気ですね | Hôm nay trời rất đẹp.\nあなたはどこに行く予定ですか？ | Bạn có dự định đi đâu không?', '2026-05-01 12:39:41'),
(6, NULL, 'はい', 'いいじゃん | À, thật tuyệt vời!\n\nどうした？ | Bạn đã làm gì vậy?', '2026-05-01 12:39:48'),
(7, NULL, '寝ます。', '寝たあとに体が軽い？ | Bạn thấy mình có cảm giác cơ thể nhẹ sau khi ngủ?', '2026-05-01 12:39:59'),
(8, NULL, 'はい', 'すごい！ | Bạn thật tuyệt vời!\n\n明日はどうする？ | Bạn sẽ làm gì ngày mai?', '2026-05-01 12:40:05'),
(9, NULL, '寝ます。', 'いいね。明日は楽しい日だね。明日は何しよう.plan？', '2026-05-01 12:40:13'),
(10, NULL, 'この質問は日本語の文法を教えてもらいたいです。', '私が教えることはできるよ！ | Tôi có thể dạy bạn.\n\n日本語の文法を学ぶには、まず基本的な文法を覚えておいてね。 | Bắt đầu bằng việc học các quy tắc cơ bản của ngữ pháp Nhật Bản.\n\n例文があるから、まずそれを見てみて。 | Hãy bắt đầu bằng cách nhìn vào ví dụ.\n\n「私は食べたい」 | Tôi muốn ăn.\n\nこの文は、名詞「私は」が動詞「食べたい」を述語として、句読点「です」を使って終わる。 | Trong câu này, \"私は\" là danh từ, \"食べたい\" là động từ và chấm câu \"です\" được sử dụng để kết thúc.\n\nさて、もう一つ例文をみてみよう。 | Vậy là hãy nhìn vào ví dụ tiếp theo.\n\n「私は食べています」 | Tôi đang ăn.\n\nこの文は、名詞「私は」が動詞「食べています」を述語として、句読点「です」を使って終わる。 | Trong câu này, \"私は\" là danh từ, \"食べています\" là động từ và chấm câu \"です\" được sử dụng để kết thúc.\n\nどうか、もう一度言ってみて。 | Hôm nay chúng ta đã học về hai loại câu, bây giờ hãy nhắc lại nhé.\n\nあなたは日本語の文法を勉強している？ | Bạn đã học những quy tắc ngữ pháp Nhật Bản chưa?', '2026-05-03 06:49:40'),
(11, NULL, 'こんにちは。', 'すー！ 今日はどうですか？ | Bạn có khỏe không?', '2026-05-03 06:49:56'),
(12, NULL, 'いいです。', 'すごくよかった！ | Rất tốt!\n\n海に泳いでいたら、友達と出会った。 | Tôi đã gặp bạn khi đang bơi ở biển.\n\nあなたは海をどう思う？ | Bạn có nghĩ gì về biển không?', '2026-05-03 06:50:13'),
(13, NULL, 'はいです。', 'すごいですね。 | Bạn thật tuyệt vời!\n\nお食事は何食べましたか？ | Bạn ăn gì?', '2026-05-03 06:50:23'),
(14, NULL, 'パンです。', 'パンもいいですが、海の幸を食べたいです。 | Món bánh này okay, nhưng tôi muốn ăn hải sản từ biển.\nあなたは海の幸を好きなものですか？ | Bạn thích ăn hải sản không?', '2026-05-03 06:50:37'),
(15, NULL, 'はい', '海は好きですか | Bạn thích biển không?', '2026-05-03 06:50:44'),
(16, NULL, 'はい', '今日はいい天気ですね | Hôm nay có thời tiết tuyệt vời nhé.\n\n海の中で泳いでいるのをみんなが見ていたのですが | Người xem đã thấy tôi đang bơi trong biển.\n\nおもしろいと思いましたか？ | Họ nghĩ tôi có vẻ thú vị không?', '2026-05-03 06:50:48'),
(17, NULL, 'こんにちは', 'こんにちは、お元気ですか？ | Bạn có khỏe không?\n\n（わー、わー！） | (Cá mập đang vui vẻ!)', '2026-05-03 06:51:09'),
(18, NULL, 'こんにちは。', 'はじめまして！ | Xin chào!\nお名前はなんですか？ | Bạn tên là gì?', '2026-05-03 06:58:13'),
(19, NULL, 'コミュニケーター', '私は日本の海を住んでいます | Tôi sống trong biển Nhật Bản.\nあなたはどこの国から来たのですか？ | Bạn đến từ quốc gia nào?', '2026-05-03 06:59:35'),
(20, NULL, 'ベトナムです。', 'ベトナムが好きです | Cảm ơn vì thích Việt Nam.\nここはどこですか？ | Bạn đang ở đâu?', '2026-05-03 06:59:49'),
(21, NULL, 'こんにちは。ベトナムに来ました。', 'ベトナムがすばらしい国ですね！ | Bạn đã đến Việt Nam, một quốc gia tuyệt vời!\n\nどうしてここに来たのですか？ | Bạn đến đây vì lý do gì?', '2026-05-03 07:00:08'),
(22, NULL, 'コーナーシーは、角の部分に設置された食事を摂る場所です。', '食べ物が置かれている場所です。\nコーナーシーを利用して、食事を楽しみながら、友達と会話するのはどうですか？', '2026-05-04 18:54:38');

-- --------------------------------------------------------

--
-- Table structure for table `flashcards`
--

CREATE TABLE `flashcards` (
  `id` int(10) UNSIGNED NOT NULL,
  `material_id` int(10) UNSIGNED NOT NULL,
  `word` varchar(255) NOT NULL,
  `kanji` varchar(255) DEFAULT NULL,
  `meaning` text DEFAULT NULL,
  `example` text DEFAULT NULL,
  `is_learned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `flashcards`
--

INSERT INTO `flashcards` (`id`, `material_id`, `word`, `kanji`, `meaning`, `example`, `is_learned`, `created_at`) VALUES
(1, 1, 'かいはつ', '開発', 'Phát triển', '新しいアプリを開発しました。', 0, '2026-04-29 10:46:11'),
(2, 1, 'かいぜん', '改善', 'Cải thiện', 'サービスを改善する。', 0, '2026-04-29 10:46:11'),
(3, 1, 'かくにん', '確認', 'Xác nhận', '詳細を確認してください。', 0, '2026-04-29 10:46:11'),
(4, 1, 'けいかく', '計画', 'Kế hoạch', '明日の計画を立てる。', 0, '2026-04-29 10:46:11'),
(5, 1, 'けいけん', '経験', 'Kinh nghiệm', '彼は豊富な経験があります。', 0, '2026-04-29 10:46:11'),
(6, 1, 'せいり', '整理', 'Sắp xếp', '資料を整理してください。', 0, '2026-04-29 10:46:11'),
(7, 1, 'そうだん', '相談', 'Thảo luận', '先生に相談します。', 0, '2026-04-29 10:46:11'),
(8, 1, 'じゅんび', '準備', 'Chuẩn bị', '今日のプレゼンを準備した。', 0, '2026-04-29 10:46:11'),
(9, 1, 'しんぱい', '心配', 'Lo lắng', '試験を心配している。', 0, '2026-04-29 10:46:11'),
(10, 1, 'せつめい', '説明', 'Giải thích', '使い方を説明します。', 0, '2026-04-29 10:46:11'),
(11, 1, 'しょうかい', '紹介', 'Giới thiệu', '友達を紹介します。', 0, '2026-04-29 10:46:11'),
(12, 1, 'けんがく', '見学', 'Tham quan', '工場を見学した。', 0, '2026-04-29 10:46:11'),
(13, 1, 'ちゅうい', '注意', 'Chú ý', '車に注意してください。', 0, '2026-04-29 10:46:11'),
(14, 1, 'はんたい', '反対', 'Phản đối', '私はその意見に反対です。', 0, '2026-04-29 10:46:11'),
(15, 1, 'へんこう', '変更', 'Thay đổi', '予定を変更しました。', 0, '2026-04-29 10:46:11'),
(16, 1, 'れんらく', '連絡', 'Liên lạc', '後で連絡します。', 0, '2026-04-29 10:46:11'),
(17, 1, 'きぼう', '希望', 'Hy vọng', '成功を希望する。', 0, '2026-04-29 10:46:11'),
(18, 1, 'よやく', '予約', 'Đặt trước', 'レストランを予約しました。', 0, '2026-04-29 10:46:11'),
(19, 1, 'さんか', '参加', 'Tham gia', 'イベントに参加します。', 0, '2026-04-29 10:46:11'),
(20, 1, 'しっぱい', '失敗', 'Thất bại', 'テストに失敗した。', 0, '2026-04-29 10:46:11'),
(21, 2, 'しょうかい', '紹介', 'Giới thiệu', '友達を紹介します。', 0, '2026-04-29 10:46:11'),
(22, 2, 'けんがく', '見学', 'Tham quan', '工場を見学した。', 0, '2026-04-29 10:46:11'),
(23, 2, 'ちゅうい', '注意', 'Chú ý', '車に注意してください。', 0, '2026-04-29 10:46:11'),
(24, 2, 'はんたい', '反対', 'Phản đối', '私はその意見に反対です。', 0, '2026-04-29 10:46:11'),
(25, 2, 'へんこう', '変更', 'Thay đổi', '予定を変更しました。', 0, '2026-04-29 10:46:11'),
(27, 2, '希望', '希望', 'Hy vọng', '成功を希望する。', 0, '2026-04-29 10:46:11'),
(28, 2, '予約', '予約', 'Đặt trước', 'レストランを予約しました。', 0, '2026-04-29 10:46:11'),
(29, 2, '参加', '参加', 'Tham gia', 'イベントに参加します。', 0, '2026-04-29 10:46:11'),
(30, 2, '失敗', '失敗', 'Thất bại', 'テストに失敗した。', 0, '2026-04-29 10:46:11'),
(31, 3, '〜ように', NULL, 'Để, để cho', '忘れないようにメモをします。', 0, '2026-04-29 10:46:11'),
(32, 3, '〜はずだ', NULL, 'Chắc chắn là', '彼は来るはずです。', 0, '2026-04-29 10:46:11'),
(33, 3, '〜ことがある', NULL, 'Đã từng', '日本に行ったことがあります。', 0, '2026-04-29 10:46:11'),
(34, 3, '〜ながら', NULL, 'Trong khi', '音楽を聞きながら勉強する。', 0, '2026-04-29 10:46:11'),
(35, 3, '〜ために', NULL, 'Vì, để', '健康のために運動する。', 0, '2026-04-29 10:46:11'),
(36, 3, '〜ずに', NULL, 'Không ...', '宿題をせずに寝た。', 0, '2026-04-29 10:46:11'),
(37, 3, '〜ようになる', NULL, 'Trở nên có thể', '日本語が話せるようになった。', 0, '2026-04-29 10:46:11'),
(38, 3, '〜にくい', NULL, 'Khó', 'この漢字は覚えにくい。', 0, '2026-04-29 10:46:11'),
(39, 3, '〜ようだ', NULL, 'Có vẻ như', '天気は雨のようだ。', 0, '2026-04-29 10:46:11'),
(40, 3, '〜つもり', NULL, 'Dự định', '明日勉強するつもりです。', 0, '2026-04-29 10:46:11'),
(41, 2, 'ほうこく', '報告', 'báo cáo', NULL, 0, '2026-05-01 11:54:14');

-- --------------------------------------------------------

--
-- Table structure for table `learning_path`
--

CREATE TABLE `learning_path` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `material_id` int(10) UNSIGNED NOT NULL,
  `current_card_index` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'in_progress',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `learning_path`
--

INSERT INTO `learning_path` (`id`, `user_id`, `material_id`, `current_card_index`, `status`, `created_at`) VALUES
(1, 1, 1, 8, 'in_progress', '2026-04-29 11:12:17'),
(2, 1, 3, 2, 'in_progress', '2026-04-29 11:23:11'),
(3, 1, 2, 4, 'in_progress', '2026-04-29 11:44:43');

-- --------------------------------------------------------

--
-- Table structure for table `quiz_question_progress`
--

CREATE TABLE `quiz_question_progress` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `batch_index` int(11) NOT NULL,
  `question_index` int(11) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `answered_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_question_progress`
--

INSERT INTO `quiz_question_progress` (`id`, `user_id`, `material_id`, `batch_index`, `question_index`, `is_correct`, `answered_at`) VALUES
(28, 1, 1, 1, 20, 1, '2026-05-03 18:35:41'),
(30, 1, 1, 1, 21, 0, '2026-05-02 19:51:40'),
(32, 1, 1, 1, 22, 0, '2026-05-02 19:51:49'),
(34, 1, 1, 1, 23, 0, '2026-05-02 19:51:50'),
(36, 1, 1, 1, 24, 0, '2026-05-02 19:52:00'),
(39, 1, 3, 0, 20, 1, '2026-05-02 19:54:34'),
(40, 1, 3, 0, 21, 1, '2026-05-02 19:54:39'),
(41, 1, 3, 0, 22, 1, '2026-05-02 19:54:47'),
(42, 1, 3, 0, 23, 1, '2026-05-02 19:54:52'),
(43, 1, 3, 0, 24, 1, '2026-05-02 19:54:56'),
(44, 1, 2, 0, 20, 1, '2026-05-03 18:29:48'),
(46, 1, 2, 0, 21, 1, '2026-05-03 06:33:04'),
(48, 1, 2, 0, 22, 1, '2026-05-03 06:33:06'),
(50, 1, 2, 0, 23, 1, '2026-05-03 06:33:09'),
(52, 1, 2, 0, 24, 1, '2026-05-03 06:33:11'),
(54, 1, 2, 0, 13, 1, '2026-05-02 19:56:19'),
(55, 1, 2, 0, 10, 1, '2026-05-02 19:56:19'),
(56, 1, 2, 0, 12, 1, '2026-05-02 19:56:19'),
(57, 1, 2, 0, 11, 1, '2026-05-02 19:56:19'),
(58, 1, 2, 0, 14, 1, '2026-05-02 19:56:19'),
(64, 1, 2, 0, 25, 1, '2026-05-03 06:33:13'),
(65, 1, 2, 0, 26, 1, '2026-05-03 06:33:16'),
(66, 1, 2, 0, 27, 1, '2026-05-03 06:33:18'),
(67, 1, 2, 0, 28, 1, '2026-05-03 06:33:20'),
(68, 1, 2, 0, 29, 1, '2026-05-03 06:33:22'),
(75, 1, 2, 0, 30, 1, '2026-05-03 16:44:48'),
(76, 1, 2, 0, 31, 1, '2026-05-03 16:44:54'),
(77, 1, 2, 0, 32, 1, '2026-05-03 16:45:00'),
(78, 1, 2, 0, 33, 1, '2026-05-03 16:45:05'),
(79, 1, 2, 0, 34, 1, '2026-05-03 16:45:12'),
(80, 1, 2, 0, 35, 1, '2026-05-03 16:45:23'),
(81, 1, 2, 0, 36, 1, '2026-05-03 16:45:30'),
(82, 1, 2, 0, 37, 1, '2026-05-03 16:45:35'),
(83, 1, 2, 0, 38, 0, '2026-05-03 16:45:41'),
(84, 1, 2, 0, 39, 1, '2026-05-03 16:45:47'),
(85, 1, 1, 1, 10, 0, '2026-05-03 16:46:53'),
(86, 1, 1, 1, 11, 0, '2026-05-03 16:47:04'),
(91, 1, 1, 0, 45, 0, '2026-05-04 15:58:40'),
(92, 1, 1, 0, 46, 0, '2026-05-04 15:58:40'),
(93, 1, 1, 0, 47, 0, '2026-05-04 15:58:56'),
(94, 1, 1, 0, 48, 0, '2026-05-04 15:58:56'),
(95, 1, 1, 0, 49, 0, '2026-05-04 16:01:00'),
(96, 1, 1, 1, 0, 0, '2026-05-04 18:19:59'),
(97, 1, 1, 0, 5, 0, '2026-05-04 18:20:59'),
(98, 1, 1, 0, 15, 0, '2026-05-04 18:23:09'),
(99, 1, 1, 0, 16, 0, '2026-05-04 18:26:17'),
(100, 1, 1, 1, 1, 0, '2026-05-06 17:45:26'),
(101, 1, 1, 1, 2, 0, '2026-05-06 17:45:47'),
(102, 1, 1, 1, 3, 0, '2026-05-06 17:46:07'),
(103, 1, 1, 1, 4, 0, '2026-05-06 17:46:40'),
(104, 1, 1, 1, 5, 0, '2026-05-06 17:47:00'),
(105, 1, 1, 1, 6, 0, '2026-05-06 17:47:20'),
(106, 1, 1, 1, 7, 0, '2026-05-06 17:47:41'),
(107, 1, 1, 1, 8, 0, '2026-05-06 17:51:12'),
(108, 1, 1, 1, 9, 0, '2026-05-06 17:53:27'),
(109, 1, 1, 1, 12, 0, '2026-05-06 18:04:44'),
(110, 1, 1, 1, 13, 0, '2026-05-06 18:05:05'),
(111, 1, 1, 1, 14, 0, '2026-05-06 18:10:36'),
(112, 1, 1, 1, 15, 0, '2026-05-06 18:11:23'),
(113, 1, 1, 0, 25, 0, '2026-05-06 18:56:46'),
(114, 1, 1, 0, 26, 1, '2026-05-06 18:56:50'),
(115, 1, 1, 0, 27, 1, '2026-05-06 18:56:54'),
(116, 1, 1, 0, 28, 1, '2026-05-06 18:56:57'),
(117, 1, 1, 0, 29, 1, '2026-05-06 18:57:00'),
(118, 1, 1, 0, 30, 1, '2026-05-07 04:04:25'),
(120, 1, 1, 0, 31, 1, '2026-05-07 04:04:32'),
(121, 1, 1, 0, 32, 1, '2026-05-07 04:04:36'),
(122, 1, 1, 0, 33, 1, '2026-05-07 04:04:38'),
(123, 1, 1, 0, 34, 1, '2026-05-07 04:04:40'),
(124, 1, 1, 0, 35, 1, '2026-05-07 04:04:43'),
(125, 1, 1, 0, 36, 1, '2026-05-07 04:04:45'),
(126, 1, 1, 0, 37, 1, '2026-05-07 04:04:49'),
(128, 1, 1, 0, 38, 1, '2026-05-07 04:04:51'),
(129, 1, 1, 0, 39, 1, '2026-05-07 04:04:53'),
(130, 1, 1, 0, 0, 1, '2026-05-09 06:49:38'),
(131, 1, 1, 0, 10, 0, '2026-05-09 06:50:42');

-- --------------------------------------------------------

--
-- Table structure for table `quiz_sessions`
--

CREATE TABLE `quiz_sessions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `material_id` int(10) UNSIGNED NOT NULL,
  `session_type` varchar(50) NOT NULL,
  `batch_index` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_questions` int(10) UNSIGNED NOT NULL,
  `correct_answers` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_sessions`
--

INSERT INTO `quiz_sessions` (`id`, `user_id`, `material_id`, `session_type`, `batch_index`, `total_questions`, `correct_answers`, `score`, `completed_at`, `created_at`) VALUES
(8, 1, 1, 'PRACTICE', 0, 10, 7, 70.00, '2026-05-01 18:50:21', '2026-05-01 11:50:21'),
(9, 1, 1, 'PRACTICE', 0, 10, 7, 70.00, '2026-05-01 18:51:31', '2026-05-01 11:51:31'),
(10, 1, 1, 'PRACTICE', 1, 10, 10, 100.00, '2026-05-01 18:51:58', '2026-05-01 11:51:58'),
(11, 1, 1, 'FINAL_BOSS', 0, 30, 25, 83.33, '2026-05-01 18:53:10', '2026-05-01 11:53:10'),
(12, 1, 1, 'PRACTICE', 0, 10, 6, 60.00, '2026-05-01 19:25:49', '2026-05-01 12:25:49'),
(13, 1, 3, 'PRACTICE', 0, 10, 10, 100.00, '2026-05-01 19:26:39', '2026-05-01 12:26:39'),
(14, 1, 3, 'PRACTICE', 0, 10, 7, 70.00, '2026-05-01 19:32:49', '2026-05-01 12:32:49'),
(15, 1, 3, 'PRACTICE', 0, 10, 7, 70.00, '2026-05-01 19:33:04', '2026-05-01 12:33:04'),
(16, 1, 3, 'PRACTICE', 0, 10, 7, 70.00, '2026-05-01 19:34:07', '2026-05-01 12:34:07'),
(17, 1, 2, 'PRACTICE', 0, 10, 10, 100.00, '2026-05-01 19:36:08', '2026-05-01 12:36:08'),
(18, 1, 2, 'PRACTICE', 1, 1, 1, 100.00, '2026-05-01 19:36:27', '2026-05-01 12:36:27'),
(19, 1, 2, 'PRACTICE', 1, 1, 1, 100.00, '2026-05-01 19:36:30', '2026-05-01 12:36:30'),
(20, 2, 1, 'PRACTICE', 0, 10, 10, 100.00, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(21, 1, 1, 'QUIZ_GROUP', 0, 5, 5, 100.00, '2026-05-02 18:11:53', '2026-05-02 11:11:53'),
(22, 1, 1, 'QUIZ_GROUP', 0, 5, 5, 100.00, '2026-05-02 18:11:55', '2026-05-02 11:11:55'),
(23, 1, 1, 'mini-quiz-0-0', 0, 5, 5, 100.00, '2026-05-03 00:42:25', '2026-05-02 17:42:25'),
(24, 1, 1, 'mini-quiz-0-0', 0, 5, 5, 100.00, '2026-05-03 00:42:27', '2026-05-02 17:42:27'),
(25, 1, 1, 'mini-quiz-0-1', 0, 5, 0, 0.00, '2026-05-03 00:43:06', '2026-05-02 17:43:06'),
(26, 1, 1, 'mini-quiz-0-1', 0, 5, 5, 100.00, '2026-05-03 00:43:07', '2026-05-02 17:43:07'),
(27, 1, 1, 'mini-quiz-0-1', 0, 5, 0, 0.00, '2026-05-03 00:43:08', '2026-05-02 17:43:08'),
(28, 1, 1, 'mini-quiz-0-1', 0, 5, 5, 100.00, '2026-05-03 00:43:09', '2026-05-02 17:43:09'),
(29, 1, 1, 'mini-quiz-0-2', 0, 5, 5, 100.00, '2026-05-03 02:23:03', '2026-05-02 19:23:03'),
(30, 1, 1, 'mini-quiz-0-2', 0, 5, 5, 100.00, '2026-05-03 02:23:04', '2026-05-02 19:23:04'),
(31, 1, 1, 'mini-quiz-0-3', 0, 5, 0, 0.00, '2026-05-03 02:24:03', '2026-05-02 19:24:03'),
(32, 1, 1, 'mini-quiz-0-3', 0, 5, 0, 0.00, '2026-05-03 02:24:05', '2026-05-02 19:24:05'),
(33, 1, 1, 'mini-quiz-0-3', 0, 5, 0, 0.00, '2026-05-03 02:24:09', '2026-05-02 19:24:09'),
(34, 1, 1, 'mini-quiz-0-3', 0, 5, 0, 0.00, '2026-05-03 02:24:11', '2026-05-02 19:24:11'),
(35, 1, 1, 'mini-quiz-0-4', 0, 5, 3, 60.00, '2026-05-03 02:30:41', '2026-05-02 19:30:41'),
(36, 1, 1, 'mini-quiz-1-0', 1, 5, 3, 60.00, '2026-05-03 02:31:33', '2026-05-02 19:31:33'),
(37, 1, 1, 'mini-quiz-0-0', 0, 5, 3, 60.00, '2026-05-03 02:49:55', '2026-05-02 19:49:55'),
(38, 1, 1, 'mini-quiz-0-1', 0, 5, 5, 100.00, '2026-05-03 02:50:10', '2026-05-02 19:50:10'),
(39, 1, 1, 'mini-quiz-0-2', 0, 5, 3, 60.00, '2026-05-03 02:50:15', '2026-05-02 19:50:15'),
(40, 1, 1, 'mini-quiz-0-2', 0, 5, 3, 60.00, '2026-05-03 02:50:18', '2026-05-02 19:50:18'),
(41, 1, 1, 'mini-quiz-0-3', 0, 5, 3, 60.00, '2026-05-03 02:50:43', '2026-05-02 19:50:43'),
(42, 1, 1, 'mini-quiz-0-4', 0, 5, 1, 20.00, '2026-05-03 02:51:22', '2026-05-02 19:51:22'),
(43, 1, 1, 'mini-quiz-1-0', 1, 5, 1, 20.00, '2026-05-03 02:52:00', '2026-05-02 19:52:00'),
(44, 1, 1, 'mini-quiz-1-0', 1, 5, 0, 0.00, '2026-05-03 02:52:01', '2026-05-02 19:52:01'),
(45, 1, 1, 'mini-quiz-1-0', 1, 5, 0, 0.00, '2026-05-03 02:52:01', '2026-05-02 19:52:01'),
(46, 1, 3, 'mini-quiz-0-0', 0, 5, 5, 100.00, '2026-05-03 02:54:57', '2026-05-02 19:54:57'),
(47, 1, 2, 'mini-quiz-0-0', 0, 5, 0, 0.00, '2026-05-03 02:56:01', '2026-05-02 19:56:01'),
(48, 1, 2, 'mini-quiz-0-0', 0, 5, 0, 0.00, '2026-05-03 02:56:01', '2026-05-02 19:56:01'),
(49, 1, 2, 'mini-quiz-0-1', 0, 5, 5, 100.00, '2026-05-03 02:56:19', '2026-05-02 19:56:19'),
(50, 1, 2, 'mini-quiz-0-2', 0, 5, 0, 0.00, '2026-05-03 02:56:24', '2026-05-02 19:56:24'),
(51, 1, 2, 'MINI_QUIZ', 0, 11, 11, 100.00, '2026-05-03 13:33:24', '2026-05-03 06:33:24');

-- --------------------------------------------------------

--
-- Table structure for table `study_materials`
--

CREATE TABLE `study_materials` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `study_materials`
--

INSERT INTO `study_materials` (`id`, `user_id`, `title`, `description`, `created_at`) VALUES
(1, 1, 'Động từ N3 - Nhóm 1', 'Bộ thẻ từ vựng động từ N3 để luyện đọc và nhớ Kanji.', '2026-04-29 10:46:11'),
(2, 1, 'Hán tự N3 - Chủ đề hàng ngày', 'Chuỗi chữ Hán thường gặp trong đời sống và công việc.', '2026-04-29 10:46:11'),
(3, 1, 'Ngữ pháp N3 cơ bản', 'Các mẫu ngữ pháp N3 thiết yếu cho câu giao tiếp hàng ngày.', '2026-04-29 10:46:11');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(80) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `total_xp` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `streak_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `global_hearts` int(10) UNSIGNED NOT NULL DEFAULT 5,
  `last_study_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `total_xp`, `streak_count`, `last_study_date`, `created_at`) VALUES
(1, 'demo', 'demo@japanese.local', '$2b$10$8i1eZ7QSFNnWDG3TvSNvjuIzx/ythPqAoE.rTedMdIjvaOlEfaSka', 3640, 0, NULL, '2026-04-29 10:46:11'),
(2, 'Bích Ngọc', 'ngoc@gmail.com', '$2b$10$uWjRkLftPSBF6azjPtiGDO96TAQpdD5/cMUFcHSbbOB49mezRxJeC', 100, 0, NULL, '2026-05-02 09:53:06');

-- --------------------------------------------------------

--
-- Table structure for table `user_flashcard_progress`
--

CREATE TABLE `user_flashcard_progress` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `flashcard_id` int(10) UNSIGNED NOT NULL,
  `material_id` int(10) UNSIGNED NOT NULL,
  `is_learned` tinyint(1) NOT NULL DEFAULT 0,
  `times_learned` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `last_learned_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_flashcard_progress`
--

INSERT INTO `user_flashcard_progress` (`id`, `user_id`, `flashcard_id`, `material_id`, `is_learned`, `times_learned`, `last_learned_at`, `created_at`) VALUES
(1, 1, 1, 1, 1, 19, '2026-05-07 09:42:39', '2026-05-01 11:32:11'),
(2, 1, 2, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(3, 1, 3, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(4, 1, 4, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(5, 1, 5, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(6, 1, 6, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(7, 1, 7, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(8, 1, 8, 1, 1, 18, '2026-05-07 09:42:39', '2026-05-01 11:48:25'),
(10, 1, 10, 1, 1, 18, '2026-05-07 09:42:40', '2026-05-01 11:48:25'),
(53, 1, 12, 1, 1, 11, '2026-05-07 10:42:35', '2026-05-01 11:51:58'),
(54, 1, 13, 1, 1, 11, '2026-05-07 10:42:35', '2026-05-01 11:51:58'),
(56, 1, 15, 1, 1, 11, '2026-05-07 10:42:35', '2026-05-01 11:51:58'),
(61, 1, 20, 1, 1, 11, '2026-05-07 10:42:35', '2026-05-01 11:51:58'),
(87, 1, 36, 3, 1, 7, '2026-05-07 01:36:24', '2026-05-01 12:26:39'),
(88, 1, 37, 3, 1, 7, '2026-05-07 01:36:24', '2026-05-01 12:26:39'),
(89, 1, 38, 3, 1, 7, '2026-05-07 01:36:24', '2026-05-01 12:26:39'),
(90, 1, 39, 3, 1, 7, '2026-05-07 01:36:24', '2026-05-01 12:26:39'),
(91, 1, 40, 3, 1, 7, '2026-05-07 01:36:24', '2026-05-01 12:26:39'),
(122, 1, 21, 2, 1, 3, '2026-05-07 09:01:45', '2026-05-01 12:36:08'),
(123, 1, 22, 2, 1, 3, '2026-05-07 09:01:45', '2026-05-01 12:36:08'),
(124, 1, 23, 2, 1, 3, '2026-05-07 09:01:45', '2026-05-01 12:36:08'),
(125, 1, 24, 2, 1, 3, '2026-05-07 09:01:45', '2026-05-01 12:36:08'),
(126, 1, 25, 2, 1, 3, '2026-05-07 09:01:46', '2026-05-01 12:36:08'),
(128, 1, 27, 2, 1, 3, '2026-05-07 09:01:46', '2026-05-01 12:36:08'),
(129, 1, 28, 2, 1, 3, '2026-05-07 09:01:46', '2026-05-01 12:36:08'),
(130, 1, 29, 2, 1, 3, '2026-05-07 09:01:46', '2026-05-01 12:36:08'),
(131, 1, 30, 2, 1, 4, '2026-05-07 09:01:46', '2026-05-01 12:36:08'),
(132, 1, 41, 2, 1, 3, '2026-05-07 09:01:46', '2026-05-01 12:36:27'),
(134, 2, 1, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(135, 2, 2, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(136, 2, 3, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(137, 2, 4, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(138, 2, 5, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(139, 2, 6, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(140, 2, 7, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(141, 2, 8, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(142, 2, 9, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(143, 2, 10, 1, 1, 1, '2026-05-02 16:54:10', '2026-05-02 09:54:10'),
(304, 1, 9, 1, 1, 6, '2026-05-07 09:42:40', '2026-05-07 02:00:49'),
(346, 1, 11, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43'),
(349, 1, 14, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43'),
(351, 1, 16, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43'),
(353, 1, 17, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43'),
(355, 1, 18, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43'),
(357, 1, 19, 1, 1, 3, '2026-05-07 10:42:35', '2026-05-07 02:12:43');

-- --------------------------------------------------------

--
-- Table structure for table `user_study_sessions`
--

CREATE TABLE `user_study_sessions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_study_sessions`
--

INSERT INTO `user_study_sessions` (`id`, `user_id`, `start_time`, `end_time`, `duration`, `date`, `created_at`) VALUES
(1, 1, '2026-04-29 18:12:17', NULL, 0, '2026-04-29', '2026-04-29 11:12:17'),
(2, 1, '2026-04-29 18:13:46', NULL, 0, '2026-04-29', '2026-04-29 11:13:46'),
(3, 1, '2026-04-29 18:18:17', NULL, 0, '2026-04-29', '2026-04-29 11:18:17'),
(4, 1, '2026-04-29 18:23:02', NULL, 0, '2026-04-29', '2026-04-29 11:23:02'),
(5, 1, '2026-04-29 18:23:11', NULL, 0, '2026-04-29', '2026-04-29 11:23:11'),
(6, 1, '2026-04-29 18:25:18', NULL, 0, '2026-04-29', '2026-04-29 11:25:18'),
(7, 1, '2026-04-29 18:44:26', NULL, 0, '2026-04-29', '2026-04-29 11:44:26'),
(8, 1, '2026-04-29 18:44:39', NULL, 0, '2026-04-29', '2026-04-29 11:44:39'),
(9, 1, '2026-04-29 18:44:43', NULL, 0, '2026-04-29', '2026-04-29 11:44:43'),
(10, 1, '2026-04-29 18:44:48', NULL, 0, '2026-04-29', '2026-04-29 11:44:48');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `flashcards`
--
ALTER TABLE `flashcards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `learning_path`
--
ALTER TABLE `learning_path`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `quiz_question_progress`
--
ALTER TABLE `quiz_question_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_answer` (`user_id`,`material_id`,`batch_index`,`question_index`);

--
-- Indexes for table `quiz_sessions`
--
ALTER TABLE `quiz_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `study_materials`
--
ALTER TABLE `study_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_flashcard_progress`
--
ALTER TABLE `user_flashcard_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_card` (`user_id`,`flashcard_id`),
  ADD KEY `flashcard_id` (`flashcard_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `user_study_sessions`
--
ALTER TABLE `user_study_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chat_history`
--
ALTER TABLE `chat_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `flashcards`
--
ALTER TABLE `flashcards`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `learning_path`
--
ALTER TABLE `learning_path`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `quiz_question_progress`
--
ALTER TABLE `quiz_question_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1729;

--
-- AUTO_INCREMENT for table `quiz_sessions`
--
ALTER TABLE `quiz_sessions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `study_materials`
--
ALTER TABLE `study_materials`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_flashcard_progress`
--
ALTER TABLE `user_flashcard_progress`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=396;

--
-- AUTO_INCREMENT for table `user_study_sessions`
--
ALTER TABLE `user_study_sessions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD CONSTRAINT `chat_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `flashcards`
--
ALTER TABLE `flashcards`
  ADD CONSTRAINT `flashcards_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `study_materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `learning_path`
--
ALTER TABLE `learning_path`
  ADD CONSTRAINT `learning_path_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `learning_path_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `study_materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz_sessions`
--
ALTER TABLE `quiz_sessions`
  ADD CONSTRAINT `quiz_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quiz_sessions_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `study_materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `study_materials`
--
ALTER TABLE `study_materials`
  ADD CONSTRAINT `study_materials_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_flashcard_progress`
--
ALTER TABLE `user_flashcard_progress`
  ADD CONSTRAINT `user_flashcard_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_flashcard_progress_ibfk_2` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_flashcard_progress_ibfk_3` FOREIGN KEY (`material_id`) REFERENCES `study_materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_study_sessions`
--
ALTER TABLE `user_study_sessions`
  ADD CONSTRAINT `user_study_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
