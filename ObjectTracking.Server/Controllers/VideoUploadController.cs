using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO.Compression;

namespace ObjectTracking.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class VideoUploadController : ControllerBase
    {
        private static string? _currentSessionPath = null;
        private readonly IWebHostEnvironment _env;

        public VideoUploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadAndPrepare(IFormFile file, [FromForm] int nFrames)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // Create a unique session folder
            var sessionId = Path.GetFileNameWithoutExtension(file.FileName) + "_" + Guid.NewGuid().ToString("N");
            var sessionFolder = Path.Combine(Path.GetTempPath(), "ObjectTracking", sessionId);
            Directory.CreateDirectory(sessionFolder);
            _currentSessionPath = sessionFolder;

            var videoPath = Path.Combine(sessionFolder, file.FileName);
            using (var stream = new FileStream(videoPath, FileMode.Create))
                await file.CopyToAsync(stream);

            // Extract frames from the video
            var framesDir = Path.Combine(sessionFolder, "frames");
            Directory.CreateDirectory(framesDir);

            // Call Python script for frame extraction
            var scriptPath = Path.Combine("Scripts", "extract_frames.py");

            var psi = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{scriptPath}\" \"{videoPath}\" \"{framesDir}\" {nFrames}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(psi);
            string output = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
                return StatusCode(500, "Frame extraction failed:\n" + error);

            return Ok(new { message = "Upload and frame extraction successful." });
        }

        [HttpGet("frames")]
        public IActionResult GetFrameList()
        {
            if (_currentSessionPath == null)
                return BadRequest("No session found.");

            var framesPath = Path.Combine(_currentSessionPath, "frames");
            var images = Directory.GetFiles(framesPath, "*.jpg").Select(Path.GetFileName).ToList();
            return Ok(images);
        }

        [HttpGet("frame/{filename}")]
        public IActionResult GetFrame(string filename)
        {
            if (_currentSessionPath == null)
                return BadRequest("No session found.");

            var framePath = Path.Combine(_currentSessionPath, "frames", filename);
            if (!System.IO.File.Exists(framePath)) return NotFound();
            return PhysicalFile(framePath, "image/jpeg");
        }

        public class LabelDto
        {
            public string Frame { get; set; } = string.Empty;
            public string Label { get; set; } = string.Empty; // empty string = no object
        }

        [HttpPost("save-label")]
        public IActionResult SaveLabel([FromBody] LabelDto data)
        {
            if (_currentSessionPath == null)
                return BadRequest("No session found.");

            var labelDir = Path.Combine(_currentSessionPath, "labels");
            Directory.CreateDirectory(labelDir);

            var labelFile = Path.Combine(labelDir, Path.ChangeExtension(data.Frame, ".txt"));
            System.IO.File.WriteAllText(labelFile, data.Label ?? "");
            return Ok();
        }

        [HttpGet("train-stream")]
        public async Task TrainStream()
        {
            if (_currentSessionPath == null)
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("No session found.");
                return;
            }

            var framesDir = Path.Combine(_currentSessionPath, "frames");
            var labelsDir = Path.Combine(_currentSessionPath, "labels");
            var modelDir = Path.Combine(_currentSessionPath, "model");

            var psi = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"-u \"Scripts/train_pipeline.py\" \"{framesDir}\" \"{labelsDir}\" \"{modelDir}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            Response.ContentType = "text/event-stream";

            var process = Process.Start(psi)!;
            using var reader = process.StandardOutput;

            // Stream process output to frontend
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (line != null)
                {
                    await Response.WriteAsync($"data: {line}\n\n");
                    await Response.Body.FlushAsync();
                }
            }

            await process.WaitForExitAsync();

            // Optionally zip here if training script doesn't do it
            var zipPath = Path.Combine(_currentSessionPath, "training_result.zip");
            if (!System.IO.File.Exists(zipPath))
            {
                using var zipStream = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.None);
                using var archive = new ZipArchive(zipStream, ZipArchiveMode.Create);
                foreach (var filePath in Directory.EnumerateFiles(_currentSessionPath, "*", SearchOption.AllDirectories))
                {
                    if (Path.GetFullPath(filePath) == Path.GetFullPath(zipPath)) continue;

                    var entryName = Path.GetRelativePath(_currentSessionPath, filePath);
                    archive.CreateEntryFromFile(filePath, entryName, CompressionLevel.Optimal);
                }
            }

            await Response.WriteAsync("data: Training complete\n\n");
            await Response.Body.FlushAsync();
        }

        [HttpGet("get-training-zip")]
        public async Task<IActionResult> GetTrainingZip()
        {
            var zipPath = Path.Combine(_currentSessionPath!, "training_result.zip");

            if (!System.IO.File.Exists(zipPath))
                return NotFound("Training result zip not found.");

            // Try up to 5 times with a short delay
            const int maxRetries = 5;
            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                try
                {
                    using var stream = new FileStream(zipPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                    using var memoryStream = new MemoryStream();
                    await stream.CopyToAsync(memoryStream);
                    return File(memoryStream.ToArray(), "application/zip", "training_result.zip");
                }
                catch (IOException)
                {
                    if (attempt == maxRetries - 1)
                        return StatusCode(500, "Could not access training zip after several attempts.");

                    await Task.Delay(200); // Wait 200ms before retrying
                }
            }

            return StatusCode(500, "Unknown error while reading training result zip.");
        }

        // Upload model and video, then process them offline
        [HttpPost("upload-assets")]
        public async Task<IActionResult> UploadAssets(IFormFile model, IFormFile video)
        {
            if (model == null || video == null || video.Length == 0)
                return BadRequest("Both model and video file must be provided.");

            // Create a unique session directory
            var sessionId = Guid.NewGuid().ToString("N");
            var sessionFolder = Path.Combine(Path.GetTempPath(), "ObjectTracking", sessionId);
            Directory.CreateDirectory(sessionFolder);
            _currentSessionPath = sessionFolder;

            var videoPath = Path.Combine(sessionFolder, video.FileName);
            var modelPath = Path.Combine(sessionFolder, "model.pt"); // standardized name

            using (var stream = new FileStream(videoPath, FileMode.Create))
                await video.CopyToAsync(stream);

            using (var stream = new FileStream(modelPath, FileMode.Create))
                await model.CopyToAsync(stream);

            return Ok(new { message = "Model and video uploaded successfully." });
        }

        // Process the video to add bounding boxes on the frames (offline processing)
        [HttpPost("process-video")]
        public async Task<IActionResult> ProcessVideo()
        {
            if (_currentSessionPath == null)
                return BadRequest("No session found.");

            var videoPath = Directory.GetFiles(_currentSessionPath, "*.mp4").FirstOrDefault();
            if (videoPath == null)
                return BadRequest("No video file found in the session.");
            var modelPath = Path.Combine(_currentSessionPath, "model.pt");
            var outputVideoPath = Path.Combine(_currentSessionPath, "processed_video.mp4");

            // Call Python script to process the video and apply bounding boxes
            var scriptPath = Path.Combine("Scripts", "process_video.py");

            var psi = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"-u \"{scriptPath}\" \"{videoPath}\" \"{modelPath}\" \"{outputVideoPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = new Process { StartInfo = psi };

            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    Console.WriteLine(e.Data);  // Or log it to your web app's logging system
                }
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    Console.Error.WriteLine(e.Data);  // Or log error
                }
            };

            process.Start();

            // Begin reading output asynchronously
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
                return StatusCode(500, "Video processing failed:\n");

            return Ok(new { message = "Video processed successfully." });
        }

        [HttpGet("download-processed-video")]
        public IActionResult DownloadProcessedVideo()
        {
            if (_currentSessionPath == null)
                return BadRequest("No session found.");

            var processedVideoPath = Path.Combine(_currentSessionPath, "processed_video.mp4");

            if (!System.IO.File.Exists(processedVideoPath))
                return NotFound("Processed video not found.");

            // Return the file for download
            var fileBytes = System.IO.File.ReadAllBytes(processedVideoPath);
            var fileName = "processed_video.mp4";
            return File(fileBytes, "video/mp4", fileName);
        }
    }
}